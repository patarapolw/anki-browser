<template lang="pug">
#App.container
  .tabs.is-boxed
    ul(style="flex-grow: 1;")
      li(v-for="t in tables.filter(t => !t.startsWith('__'))" :class="t === tableName ? 'is-active' : ''"
        @contextmenu.prevent="(evt) => { selectedTable = t; $refs.tableContext.open(evt) }")
        a(role="button" @click="changeTable(t)")
          CellEditor(:value="t" @finish-editing="renameTable($event, t)" type="input"
            :rules="validator.getIdentifierRules('table', t)" :before-open="() => checkCommit()"
            :manual="true" :marginless="true" :ref="'table.' + t")
      li
        a(role="button")
          CellEditor(placeholder="+" @finish-editing="addTable($event)" type="input"
            :rules="validator.getIdentifierRules('table')" :before-open="() => checkCommit()")
  nav.nav
    div(style="width: 600px;")
      .file.has-name.is-fullwidth(@click="openFile" @contextmenu.prevent="$refs.fileContext.open")
        label.file-label
          span.file-cta
            span.file-label Filename:
          span.file-name {{filepath || 'New file'}}
    div(style="flex-grow: 1;")
    .buttons
      button.button.is-outlined(
        :class="Object.keys(editList).length === 0 ? '' : 'is-success'"
        :disabled="Object.keys(editList).length === 0"
        @click="commit"
      )
        fontawesome(icon="check")
      button.button.is-outlined(
        :class="Object.keys(editList).length === 0 ? '' : 'is-danger'"
        :disabled="Object.keys(editList).length === 0"
        @click="clear"
      )
        fontawesome(icon="times")
    .row-align
      .field(style="flex-grow: 1;")
        .control.has-icons-left
          input.input(v-model="qTmp" @keydown.enter="q = qTmp")
          span.icon.is-small.is-left
            fontawesome(icon="search")
      b-tooltip.center-vh(label="Please visit https://github.com/patarapolw/qsearch on how to search"
        type="is-white" position="is-left" multilined)
        fontawesome(icon="question" style="color: #ccc;")
  .table-container
    table.table.is-striped.is-hoverable.is-bordered
      thead
        tr
          th(v-if="tableMeta.column.length === 0")
            .padded ROWID
          th(v-for="c in columns.filter(c => c.pk)" :key="c.name")
            div(@contextmenu.prevent="(evt) => { selectedField = c.name; $refs.colContext.open(evt) }")
              CellEditor(v-model="c.name" @finish-editing="renameCol($event, c.name)" type="input"
                :rules="validator.getIdentifierRules('column', c.name)"
                :centered="true")
                template(v-slot:after)
                  fontawesome.sorter(v-if="sort[0] === c.name" icon="caret-down")
                  fontawesome.sorter(v-else-if="sort[0] === '-' + c.name" icon="caret-up")
                  fontawesome.sorter.secondary(v-else-if="sort.includes(c.name)" icon="caret-down")
                  fontawesome.sorter.secondary(v-else-if="sort.includes('-' + c.name)" icon="caret-up")
          th(v-for="c in columns.filter(c => !c.pk)" :key="c.name")
            div(@contextmenu.prevent="(evt) => { selectedField = c.name; $refs.colContext.open(evt) }")
              CellEditor(v-model="c.name" @finish-editing="renameCol($event, c.name)" type="input"
                :rules="validator.getIdentifierRules('column', c.name)"
                :centered="true")
                template(v-slot:after)
                  fontawesome.sorter(v-if="sort[0] === c.name" icon="caret-down")
                  fontawesome.sorter(v-else-if="sort[0] === '-' + c.name" icon="caret-up")
                  fontawesome.sorter.secondary(v-else-if="sort.includes(c.name)" icon="caret-down")
                  fontawesome.sorter.secondary(v-else-if="sort.includes('-' + c.name)" icon="caret-up")
          th
            CellEditor(placeholder="+" @finish-editing="addCol($event)" type="input"
              :rules="validator.getIdentifierRules('column')")
      tbody
        tr(v-for="d in data" :key="d.__id")
          th(v-if="tableMeta.column.length === 0")
            .padded {{d.__id}}
          th(v-for="c in columns.filter(c => c.pk)" :key="c.name"
            @contextmenu.prevent="(evt) => { if(d.__id) { selectedRow = d; $refs.rowContext.open(evt) }}"
          )
            CellEditor(v-model="d[c.name]"
              @finish-editing="onFinishEdit(d, c.name, $event)"
              type="textarea"
              :placeholder="d.__id ? '' : ' '"
              :rules="validator.getCellRules(c.name, getXType(c.name))"
              :formatter="formatter.getCellFormatter(c.name, getXType(c.name))"
            )
          td(v-for="c in columns.filter(c => !c.pk)" :key="c.name"
            @contextmenu.prevent="(evt) => { selectedRow = d; selectedField = c.name; $refs.cellContext.open(evt) }"
          )
            CellEditor(v-model="d[c.name]"
              @finish-editing="onFinishEdit(d, c.name, $event)"
              type="textarea"
              :placeholder="d.__id ? '' : ' '"
              :rules="validator.getCellRules(c.name, getXType(c.name))"
              :formatter="formatter.getCellFormatter(c.name, getXType(c.name))"
            )
          td
            div
  b-pagination(:total="count" :current.sync="page")
  .modal(:style="{ display: isCommitFirstModal ? 'flex' : 'none'}")
    .modal-background
    .modal-card(style="border-radius: 6px;")
      b-message(type="is-warning" has-icon style="margin-bottom: 0;") Do you want to commit first?
      footer.modal-card-foot
        button.button.is-success(@click="commit(); isCommitFirstModal = false") Commit
        button.button.is-warning(@click="clear(); isCommitFirstModal = false") Do not commit
        button.button(@click="isCommitFirstModal = false") Cancel
  TableSettings(v-if="isTableSettingsModal" :name="selectedTable"
    :meta="dotProp.get(dbMeta, 'table', {})"
    :indexMeta="indexMeta" :tables="tables"
    @save="setTableSettings" @close="isTableSettingsModal = false")
  ColSettings(v-if="isColSettingsModal" :name="selectedField"
    :meta="dotProp.get(dbMeta, 'col.' + selectedField, {})" :tableMeta="tableMeta"
    :indexMeta="dbMeta.index || {}"
    @save="setColSettings" @close="isColSettingsModal = false")
  contextmenu(ref="fileContext" lazy)
    li
      a(role="button" @click="filepath = ''") Create new file
    li
      a(role="button" @click="reset()") Reload
  contextmenu(ref="tableContext" lazy)
    li
      a(role="button" @click="isTableSettingsModal = true") Settings
    li
      a(role="button" @click="normalizeArray($refs['table.' + selectedTable]).doEdit()") Rename
    li
      a(role="button" @click="deleteTable") Delete
  contextmenu(ref="colContext" lazy)
    li.v-context__sub
      a Sort
      ul.v-context
        li
          a(role="button" @click="sort = [selectedField]") Sort ascending
        li
          a(role="button" @click="sort = ['-' + selectedField]") Sort descending
        li
          a(role="button" @click="sort.push(selectedField)") Sort ascending secondarily
        li
          a(role="button" @click="sort.push('-' + selectedField)") Sort descending secondarily
    li.v-context__sub
      a Data type
      ul.v-context
        li(:class="fieldType === 'TEXT' ? 'is-active' : ''")
          a(
            role="button"
            @click="fieldType = 'TEXT'"
          ) TEXT
        li(:class="fieldType === 'INTEGER' ? 'is-active' : ''")
          a(
            role="button"
            @click="fieldType = 'INTEGER'"
          ) INTEGER
        li(:class="fieldType === 'REAL' ? 'is-active' : ''")
          a(
            role="button"
            @click="fieldType = 'REAL'"
          ) REAL
        li(:class="fieldType === 'BLOB' ? 'is-active' : ''")
          a(
            role="button"
            @click="fieldType = 'BLOB'"
          ) BLOB
        li(:class="fieldType === 'date' ? 'is-active' : ''")
          a(
            role="button"
            @click="fieldType = 'date'"
          ) date
        li(:class="fieldType === 'boolean' ? 'is-active' : ''")
          a(
            role="button"
            @click="fieldType = 'boolean'"
          ) boolean
        li(:class="fieldType === 'jsonobject' ? 'is-active' : ''")
          a(
            role="button"
            @click="fieldType = 'jsonobject'"
          ) jsonobject
        li(:class="fieldType === 'jsonarray' ? 'is-active' : ''")
          a(
            role="button"
            @click="fieldType = 'jsonarray'"
          ) jsonarray
    li.v-context__sub(v-if="selectedIndexStatus !== 'compound'")
      a Indexing
      ul.v-context
        li(v-if="!selectedIndexStatus !== 'unique'")
          a(
            role="button"
            @click="selectedIndexStatus = 'unique'"
          ) Set as UNIQUE
        li(v-if="selectedIndexStatus !== 'index'")
          a(
            role="button"
            @click="selectedIndexStatus = 'index'"
          ) Set as INDEX
        li(v-if="selectedIndexStatus !== ''")
          a(
            role="button"
            @click="selectedIndexStatus = ''"
          ) Delete INDEX
    li
      a(
        role="button"
        v-if="!selectedPK"
        @click="selectedPK = true"
      ) Set as PRIMARY KEY
      a(
        role="button"
        v-else
        @click="selectedPK = false"
      ) Unset PRIMARY KEY
    li
      a(role="button" @click="isColSettingsModal = true") Settings
    li
      a(role="button" @click="deleteCol") Delete
  contextmenu(ref="rowContext" lazy)
    li
      a(role="button" @click="deleteRow") Delete
  contextmenu(ref="cellContext" lazy)
    li
      a(role="button" @click="setNull") Set NULL
  b-loading(:active.sync="isLoading")
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'
import { nanoid } from 'nanoid'
import dotProp from 'dot-prop'
import dayjs from 'dayjs'
import { remote } from 'electron'

import CellEditor from './components/CellEditor.vue'
import TableSettings from './components/TableSettings.vue'
import ColSettings from './components/ColSettings.vue'
import { normalizeArray, encode } from './assets/util'
import { api } from './assets/api'
import { IColumn } from './assets/types'
import { Validator } from './assets/validator'
import { Formatter } from './assets/formatter'

@Component({
  components: {
    CellEditor,
    TableSettings,
    ColSettings
  }
})
export default class App extends Vue {
  data: any[] = []
  isLoading = false

  count = 0
  perPage = 10
  page = 1
  sort: string[] = []

  tableName = 'default'
  dbMeta: any = {}
  tableMeta = {
    column: [] as IColumn[],
    index: [] as {
      name: string
      unique: number
      info: {
        name: string
      }[]
    }[]
  }

  tables: string[] = ['default']

  selectedTable = ''
  selectedField = ''
  selectedRow: any = {}
  selectedIndex = ''

  editList: any = {}

  isCommitFirstModal = false
  afterCommitFn: (() => void) | null = null

  isTableSettingsModal = false
  isColSettingsModal = false

  q = ''
  qTmp = ''

  dotProp = dotProp
  normalizeArray = normalizeArray

  filepath = ''

  get columns (): IColumn[] {
    return this.tableMeta.column
  }

  get validator () {
    return new Validator(this.tables, this.columns)
  }

  get formatter () {
    return new Formatter(this.columns)
  }

  get selectedIndexStatus (): string {
    let status = ''
    const index = this.tableMeta.index

    index
      .filter((idx) => idx.unique && idx.info.some((info) => info.name === this.selectedField))
      .map((idx) => {
        const names = idx.info
        if (names.length > 1) {
          status = 'compound'
        } else if (!status) {
          status = idx.unique ? 'unique' : 'index'
        }
      })

    return status
  }

  set selectedIndexStatus (status: string) {
    const toUpdateIdx = this.tableMeta.index.filter((i) => i.info.some((info) => info.name === this.selectedField))[0]

    if (!toUpdateIdx) {
      if (['unique', 'index'].includes(status)) {
        this.tableMeta.index.push({
          name: `${this.selectedField}_unique_idx`,
          unique: Number(status === 'unique'),
          info: [{
            name: this.selectedField
          }]
        })

        dotProp.set(this.editList, `table.index.${this.selectedField}_unique_idx`, {
          name: [this.selectedField],
          unique: status === 'unique'
        })
      }
    } else {
      if (['unique', 'index'].includes(status)) {
        toUpdateIdx.unique = Number(status === 'unique')

        dotProp.set(this.editList, `table.index.${toUpdateIdx.name}`, {
          name: [this.selectedField],
          unique: status === 'unique'
        })
      } else if (!status) {
        this.tableMeta.index = this.tableMeta.index.filter((i) => i.name !== toUpdateIdx.name)

        dotProp.set(this.editList, `table.index.${toUpdateIdx.name}`, {})
      }
    }

    this.$set(this.tableMeta, 'index', this.tableMeta.index)
    this.$set(this, 'editList', this.editList)
  }

  get selectedPK () {
    const c = this.tableMeta.column.filter((c) => c.name === this.selectedField && c.pk)[0]
    return !!c
  }

  set selectedPK (type: boolean) {
    const column = this.tableMeta.column
    column.map((c: any) => {
      if (c.name === this.selectedField) {
        c.pk = type ? 1 : 0
        dotProp.set(this.editList, `col.${this.selectedField}.pk`, type)
      }
    })

    this.$set(this.tableMeta, 'column', column)
    this.$set(this, 'editList', this.editList)
  }

  get fieldType () {
    const xtype = dotProp.get<string>(this.dbMeta, `${this.tableName}.col.${this.selectedField}.type`)
    return xtype || this.validator.getType(this.selectedField)
  }

  set fieldType (xtype: string) {
    let type = xtype

    if (type === xtype.toLocaleLowerCase()) {
      if (type === 'boolean') {
        type = 'INTEGER'
      } else if (type === 'date') {
        type = 'INTEGER'
      } else {
        type = 'TEXT'
      }
    }

    dotProp.set(this.editList, `col.${this.selectedField}.type`, type)
    dotProp.set(this.dbMeta, `${this.tableName}.col.${this.selectedField}.type`, xtype)

    this.$set(this, 'editList', this.editList)
    this.$set(this, 'dbMeta', this.dbMeta)

    this.$forceUpdate()
  }

  get indexMeta () {
    const { index = {} } = this.dbMeta
    for (const [k, v] of Object.entries<any>(index)) {
      if (v.names.includes(this.selectedField)) {
        this.selectedIndex = k
        return v
      }
    }

    this.selectedIndex = nanoid()
    return null
  }

  created () {
    this.init()
  }

  getXType (field: string) {
    return dotProp.get<string>(this.dbMeta, `${this.tableName}.col.${field}.type`)
  }

  @Watch('filepath')
  async init () {
    this.qTmp = ''
    this.q = ''
    this.page = 1
    this.data = []

    if (this.filepath) {
      this.isLoading = true

      const r = await api.get('/api/file/info', {
        params: {
          path: this.filepath
        }
      })

      this.tables = r.data.tables
      this.tableName = r.data.tables[0]
      this.$set(this, 'dbMeta', r.data.meta)

      this.isLoading = false
    } else {
      this.tables = ['default']
      this.tableName = 'default'
      this.dbMeta = {}
    }

    this.page = 1
    this.sort = []

    this.onPageChange()
  }

  @Watch('q')
  @Watch('sort', { deep: true })
  async reset () {
    this.page = 1
    await this.onPageChange()
  }

  @Watch('page')
  async onPageChange () {
    if (this.filepath) {
      this.isLoading = true

      const r = await api.post('/api/table/q', {
        q: this.q,
        offset: (this.page - 1) * this.perPage,
        limit: this.perPage,
        sort: this.sort
      }, {
        params: {
          table: this.tableName
        }
      })
      const { result, count, meta } = r.data
      this.$set(this, 'tableMeta', r.data.meta)

      this.count = count
      this.data = result

      this.addRow()

      this.isLoading = false
    } else {
      this.$nextTick(() => {
        this.page = 1
        this.count = 0
        this.data = []
        this.tableMeta.column = []
        this.tableMeta.index = []
        this.$set(this, 'tableMeta', this.tableMeta)

        this.addRow()
      })
    }
  }

  addTable (name: string) {
    if (!name.trim()) {
      return
    }

    this.checkCommit(() => {
      this.tableName = name
    })
  }

  changeTable (name: string) {
    this.checkCommit(() => {
      this.tableName = name
    })
  }

  async renameTable (newName: string, oldName: string) {
    if (newName === oldName) {
      return
    }

    if (this.tableName === oldName) {
      this.checkCommit(async () => {
        await api.patch('/api/table/rename', undefined, {
          params: {
            table: oldName,
            new: newName
          }
        })

        this.tables = this.tables.map(t => t === oldName ? newName : t)
        this.tableName = newName
      })
    } else {
      await api.patch('/api/table/rename', undefined, {
        params: {
          table: oldName,
          new: newName
        }
      })

      this.tables = this.tables.map(t => t === oldName ? newName : t)
    }
  }

  async deleteTable () {
    this.$buefy.dialog.confirm({
      message: `Are you sure you want to delete table: ${this.selectedTable}?`,
      type: 'is-danger',
      hasIcon: true,
      onConfirm: async () => {
        await api.delete('/api/table/', {
          params: {
            table: this.selectedTable
          }
        })

        this.tables = this.tables.filter(t => t !== this.selectedTable)
        if (this.selectedTable === this.tableName) {
          this.tableName = this.tables[0]
        }
      }
    })
  }

  checkCommit (cb?: () => void) {
    if (Object.keys(this.editList).length > 0) {
      this.afterCommitFn = cb || null
      this.isCommitFirstModal = true

      return false
    }

    if (cb) {
      cb()
    }

    return true
  }

  @Watch('tableName')
  onTableChange () {
    if (!this.tables.includes(this.tableName)) {
      this.tables = [...this.tables, this.tableName]
    }

    this.qTmp = ''
    this.q = ''
    this.page = 1
    this.sort = []
    this.onPageChange()
  }

  addRow () {
    this.data = [
      {},
      ...this.data
    ]
  }

  async deleteRow () {
    this.$buefy.dialog.confirm({
      message: 'Are you sure you want to delete this row?',
      type: 'is-danger',
      hasIcon: true,
      onConfirm: () => {
        dotProp.set(this.editList, `row.${encode(this.selectedRow.__id)}`, {})
        this.$set(this, 'editList', this.editList)

        this.data = this.data.filter(d => {
          return d.__id !== this.selectedRow.__id
        })
      }
    })
  }

  addCol (name: string) {
    if (!name.trim()) {
      return
    }

    this.tableMeta.column = [
      ...this.columns,
      {
        name,
        type: 'TEXT',
        dflt_value: null,
        pk: 0,
        notnull: 0
      }
    ]

    dotProp.set(this.editList, `col.${name}.type`, 'TEXT')
    this.$set(this, 'editList', this.editList)
  }

  renameCol (name: string, oldName: string) {
    if (!name.trim() || name === oldName) {
      return
    }

    dotProp.set(this.editList, `col.${oldName}.rename`, name)

    this.tableMeta.column = this.columns.map(c => {
      if (c.name === oldName) {
        c.name = name
      }

      return c
    })

    this.data = this.data.map(d => {
      const d1: any = {}
      Object.entries(d).map(([k, v]) => {
        if (k === oldName) {
          d1[name] = v
        } else {
          d1[k] = v
        }
      })
      return d1
    })

    Object.values(dotProp.get<any>(this.editList, 'row', {})).map((d: any) => {
      Object.entries(d.data).map(([k, v]) => {
        if (k === oldName) {
          d[name] = v
          delete d[k]
        }
      })
    })

    this.$set(this, 'editList', this.editList)
  }

  async deleteCol () {
    this.$buefy.dialog.confirm({
      message: `Are you sure you want to delete column: ${this.selectedField}?`,
      type: 'is-danger',
      hasIcon: true,
      onConfirm: () => {
        this.data = this.data.map(d => {
          const d1: any = {}
          Object.entries(d).map(([k, v]) => {
            if (k !== this.selectedField) {
              d1[k] = v
            }
          })

          return d1
        })

        this.tableMeta.column = this.columns.filter(c => c.name !== this.selectedField)

        dotProp.set(this.editList, `col.${this.selectedField}`, {})
        this.$set(this, 'editList', this.editList)
      }
    })
  }

  setNull () {
    this.data = this.data.map(d => {
      if (d.__id === this.selectedRow.__id) {
        Object.entries(d).map(([k, v]) => {
          if (k === this.selectedField) {
            d[k] = null
          }
        })
        d.__id = nanoid()
      }

      return d
    })

    dotProp.set(this.editList, `row.${encode(this.selectedRow.__id)}.data.${this.selectedField}`, null)
    this.$set(this, 'editList', this.editList)
  }

  onFinishEdit (row: any, field: string, data: string) {
    if (!row.__id) {
      if (data.trim()) {
        row.__id = nanoid()
        row[field] = data

        dotProp.set(this.editList, `row.${encode(row.__id)}.data.${field}`, data)
        this.$set(this, 'editList', this.editList)

        this.data = [
          {},
          ...this.data
        ]
        this.$set(this, 'data', this.data)
      }
    } else if (row[field] !== data) {
      dotProp.set(this.editList, `row.${encode(row.__id)}.data.${field}`, data)
      this.$set(this, 'editList', this.editList)
      this.$set(this, 'data', this.data.map(d => {
        if (d.__id === row.__id) {
          d[field] = data
        }

        return d
      }))
    }
  }

  async commit () {
    const path = this.filepath || (await remote.dialog.showSaveDialog({
      filters: [
        { name: 'SQLite database', extensions: ['db', 'sqlite', 'sqlite3'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })).filePath

    if (!path) {
      this.$buefy.snackbar.open('Not saved')
      return
    }

    await api.patch('/api/file/', this.dbMeta, {
      params: {
        path
      }
    })

    await api.patch('/api/table/', this.editList, {
      params: {
        table: this.tableName
      }
    })

    this.filepath = path
    this.clear()
  }

  clear () {
    this.$set(this, 'editList', {})
    this.reset()
  }

  setTableSettings (s: { meta: any, index: any }) {
    dotProp.set(this.dbMeta, 'table', s.meta)

    if (s.index) {
      dotProp.set(this.dbMeta, 'index', s.index)
    }

    this.$set(this, 'dbMeta', this.dbMeta)

    this.isTableSettingsModal = false
  }

  setColSettings (s: { meta: any, index: any }) {
    if (Object.keys(s.meta).length > 0) {
      dotProp.set(this.dbMeta, `col.${this.selectedField}`, s.meta)
    }

    if (s.index) {
      dotProp.set(this.dbMeta, `index.${this.selectedIndex}`, s.index)
    }

    this.$set(this, 'dbMeta', this.dbMeta)

    this.isColSettingsModal = false
  }

  openFile () {
    this.checkCommit(async () => {
      const r = await remote.dialog.showOpenDialog({
        filters: [
          { name: 'SQLite database', extensions: ['db', 'sqlite', 'sqlite3'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      })

      this.filepath = (r.filePaths || [])[0] || ''
    })
  }
}
</script>

<style lang="scss">
body {
  min-width: 100vw;
  min-height: 100vh;
}

#App {
  .nav {
    margin-bottom: 1em;
    display: flex;
    flex-direction: row;
    justify-content: center;

    @media all and (max-width: 600px) {
      flex-direction: column;

      > * + * {
        margin-top: 0.5em;
      }
    }

    @media not all and (max-width: 600px) {
      > * + * {
        margin-left: 0.5em;
      }
    }

    * {
      margin-bottom: 0 !important;
    }

    .buttons {
      white-space: nowrap;
      display: block;
      align-self: center;
    }

    .row-align {
      display: flex;
      flex-direction: row;
      justify-content: center;
      word-break: keep-all;

      > * + * {
        margin-left: 0.5em;
      }
    }

    .center-vh {
      display: flex;
      justify-content: center;
      align-items: center;
    }
  }

  table.table {
    th, td {
      padding: 0;

      > .padded {
        margin: 0.5em;
        min-height: 1em;
        min-width: 2em;
      }
    }

    th {
      background-color: rgba(238, 238, 238, 0.5);

      .sorter {
        margin-left: 0.5em;

        &.secondary {
          color: lightgray;
        }
      }
    }
  }
}

[role="button"] {
  cursor: pointer;
}

.v-context {
  li.is-active {
    background-color: rgb(221, 239, 255);
  }

  .v-context__sub {
    > a:after {
      content: "▶" !important;
    }
  }
}
</style>
