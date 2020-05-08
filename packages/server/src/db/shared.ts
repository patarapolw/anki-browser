import { Apkg } from 'ankisync'

let apkg: Apkg | null = null

export async function getDb (filename?: string): Promise<Apkg> {
  if (!filename) {
    if (!apkg) {
      throw new Error('Please open a database first.')
    }

    return apkg
  }

  if (apkg) {
    if (apkg.filePath !== filename) {
      await apkg.anki2.db.close()
      apkg = await Apkg.connect(filename)
    }
  } else {
    apkg = await Apkg.connect(filename)
  }

  return apkg
}
