import path from 'path'
import crypto from 'crypto'

import fs from 'fs-extra'
import AdmZip from 'adm-zip'
import rimraf from 'rimraf'
import sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite'

export class Anki2 {
  public static async connect (colPath: string) {
    const db = await open({
      filename: colPath,
      driver: sqlite3.Database
    })
    const tables = (await db.all(/*sql*/`
      SELECT name FROM sqlite_master WHERE type='table'
    `)).map((t) => t.name as string)

    if (!tables.includes('deck')) {
      await db.exec(/*sql*/`
        CREATE TABLE IF NOT EXISTS decks (
          id      INTEGER PRIMARY KEY,
          [name]  TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS media (
          id      INTEGER PRIMARY KEY,
          [name]  TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS models (
          id      INTEGER PRIMARY KEY,
          [name]  TEXT NOT NULL,
          flds    TEXT NOT NULL,  -- \x1f field
          css     TEXT
        );

        CREATE TABLE IF NOT EXISTS templates (
          mid     INTEGER NOT NULL REFERENCES models(id),
          ord     INTEGER NOT NULL,
          [name]  TEXT NOT NULL,
          qfmt    TEXT NOT NULL,
          afmt    TEXT
        )
      `)

      const { decks, models } = await db.get(/*sql*/`
        SELECT decks, models FROM col
      `)!

      await mapAsync(Object.values(JSON.parse(decks)), async (d: any) => {
        await db.run(/*sql*/`
          INSERT INTO decks (id, [name]) VALUES (?, ?)
        `, [parseInt(d.id), d.name])
      })

      await mapAsync(Object.values(JSON.parse(models)), async (m: any) => {
        await db.run(/*sql*/`
          INSERT INTO models (id, [name], flds, css)
          VALUES (?, ?, ?, ?)
        `, [parseInt(m.id), m.name, m.flds.map((f: any) => f.name).join('\x1f'), m.css])

        await mapAsync(m.tmpls, async (t: any, i: number) => {
          await db.run(/*sql*/`
            INSERT INTO templates (mid, ord, [name], qfmt, afmt)
            VALUES (?, ?, ?, ?, ?)
          `, [parseInt(m.id), i, t.name, t.qfmt, t.afmt])
        })
      })
    }

    return new Anki2({ colPath, db })
  }

  db: Database
  colPath: string;

  private constructor (params: { colPath: string, db: Database }) {
    this.db = params.db
    this.colPath = params.colPath
  }

  async find (where?: string, postfix?: string): Promise<{
    deck: string;
    values: string[];
    keys: string[];
    css: string | null;
    qfmt: string;
    afmt: string | null;
    template: string;
    model: string;
  }[]> {
    return (await this.db.all(/*sql*/`
      SELECT
        d.name AS deck,
        n.flds AS [values],
        m.flds AS keys,
        m.css AS css,
        t.qfmt AS qfmt,
        t.afmt AS afmt,
        t.name AS template,
        m.name AS model
      FROM cards AS c
      JOIN notes AS n ON c.nid = n.id
      JOIN decks AS d ON c.did = d.id
      JOIN models AS m ON n.mid = m.id
      JOIN templates AS t ON t.ord = c.ord AND t.mid = n.mid
      ${where ? `WHERE ${where}` : ''}
      ${postfix || ''}
    `)).map((el) => {
      el.keys = el.keys.split('\x1f')
      el.values = el.values.split('\x1f')

      return el
    })
  }

  async finalize () {
    const { models, decks } = await this.db.get(/*sql*/`
      SELECT models, decks FROM col
    `)!
    const ms = JSON.parse(models)
    const ds = JSON.parse(decks)

    await mapAsync(await this.db.all(/*sql*/`
      SELECT id, [name], flds, css FROM models
    `), async (m: any) => {
      const ts = await this.db.all(/*sql*/`
        SELECT [name], ord, qfmt, afmt FROM templates
        WHERE mid = ? ORDER BY ord
      `, [m.id])

      ms[m.id.toString()] = {
        id: m.id,
        css: m.css,
        flds: m.flds.split('\x1f').map((f: string) => ({
          size: 20,
          name: f,
          media: [],
          rtl: false,
          ord: 0,
          font: 'Arial',
          sticky: false
        })),
        tmpls: ts.map((t) => ({
          afmt: t.afmt || '',
          name: t.name,
          qfmt: t.qfmt,
          did: null,
          ord: t.ord,
          bafmt: '',
          bqfmt: ''
        })),
        vers: [],
        name: m.name,
        tags: [],
        did: 1,
        usn: -1,
        req: [
          [
            0,
            'all',
            [
              0
            ]
          ],
          [
            1,
            'all',
            [
              1,
              2
            ]
          ]
        ],
        sortf: 0,
        latexPre: '\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n',
        latexPost: '\\end{document}',
        type: 0,
        mod: 1540966298
      }
    });

    (await this.db.all(/*sql*/`
      SELECT id, [name] FROM decks
    `)).map((d) => {
      ds[d.id.toString()] = {
        id: d.id,
        name: d.name,
        extendRev: 50,
        usn: 0,
        collapsed: false,
        newToday: [
          0,
          0
        ],
        timeToday: [
          0,
          0
        ],
        dyn: 0,
        extendNew: 10,
        conf: 1,
        revToday: [
          0,
          0
        ],
        lrnToday: [
          0,
          0
        ],
        mod: 1540966298,
        desc: ''
      }
    })

    await this.db.run(/*sql*/`
      UPDATE col
      SET models = ?, decks = ?
    `, [JSON.stringify(ms), JSON.stringify(ds)])

    await this.db.exec(/*sql*/`
      DROP TABLE templates;
      DROP TABLE models;
      DROP TABLE decks;
    `)
  }

  async cleanup () {
    await this.db.close()
  }
}

export class Apkg {
  static async connect (filePath: string, overwrite: boolean = true) {
    const p = path.parse(filePath)
    let dir = path.join(p.dir, p.name)
    const originalDir = dir

    if (!overwrite) {
      while (fs.existsSync(dir)) {
        dir = originalDir + '_' + Math.random().toString(36).substr(2)
      }
    }

    fs.ensureDirSync(dir)

    if (fs.existsSync(filePath)) {
      const zip = new AdmZip(filePath)
      zip.extractAllTo(dir)
    }

    const anki2 = await Anki2.connect(path.join(dir, 'collection.anki2'))

    if (fs.existsSync(path.join(dir, 'media'))) {
      const mediaJson = JSON.parse(fs.readFileSync(path.join(dir, 'media'), 'utf8'))
      await Promise.all(Object.keys(mediaJson).map((k) => {
        const data = fs.readFileSync(path.join(dir, k))

        anki2.db.run(/*sql*/`
        INSERT INTO media (h, [name])
        VALUES (?, ?)
        `, [
          crypto.createHash('sha256').update(data).digest('base64'),
          mediaJson[k]
        ])
      }))
    }

    return new Apkg({ filePath, anki2, dir })
  }

  filePath: string;
  dir: string;
  anki2: Anki2;

  private constructor (params: { filePath: string, anki2: Anki2, dir: string }) {
    this.filePath = params.filePath
    this.anki2 = params.anki2
    this.dir = params.dir
  }

  async finalize (overwrite = true) {
    await this.anki2.finalize()
    const mediaJson = {} as any

    const zip = new AdmZip()
    zip.addLocalFile(path.join(this.dir, 'collection.anki2'));

    (await this.anki2.db.all(/*sql*/`
      SELECT id, [name] FROM media
    `)).map((m) => {
      mediaJson[m.id.toString()] = m.name
      zip.addFile(m.name, fs.readFileSync(path.join(this.dir, m.id.toString())))
    })

    zip.addFile('media', Buffer.from(JSON.stringify(mediaJson)))

    await this.anki2.db.close()

    if (!overwrite) {
      const originalFilePath = this.filePath

      while (fs.existsSync(this.filePath)) {
        const p = path.parse(originalFilePath)
        this.filePath = p.dir + p.base + '_' + Math.random().toString(36).substr(2) + p.ext
      }
    }

    zip.writeZip(this.filePath)
    rimraf.sync(this.dir)
  }

  /**
   * You will lose any unsaved data.
   *
   * Use #finalize to save data.
   */
  async cleanup () {
    await this.anki2.cleanup()
    rimraf.sync(this.dir)
  }
}

export async function mapAsync<T, R = T> (
  arr: T[],
  cb: (el: T, i: number, a0: T[]) => Promise<R>
): Promise<R[]> {
  return Promise.all(arr.map(async (el, i, a0) => {
    return await cb(el, i, a0)
  }))
}
