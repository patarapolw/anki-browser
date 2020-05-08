<template lang="pug">
.container(style="padding-top: 1em;")
  nav.nav
    div(style="width: 600px;")
      .file.has-name.is-fullwidth(@click="openFile")
        label.file-label
          span.file-cta
            span.file-label Filename:
          span.file-name {{filepath}}
    div(style="flex-grow: 1;")
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
    table.table.is-striped.is-hoverable
      thead
        tr
          th.sortable(rowspan="2"
            v-for="h in header" :key="h"
            @click="sort[0] = h"
          )
            span {{h}}
            fontawesome.sorter(v-if="sort[0] === h" icon="caret-down")
            fontawesome.sorter(v-else-if="sort[0] === '-' + h" icon="caret-up")
            fontawesome.sorter.secondary(v-else-if="sort.includes(h)" icon="caret-down")
            fontawesome.sorter.secondary(v-else-if="sort.includes('-' + h)" icon="caret-up")
          th(:colspan="dataHeader.length") Data
        tr
          th.sortable(v-for="h in dataHeader" :key="h"
            @click="sort[0] = 'data.' + h"
          )
            span {{h}}
            fontawesome.sorter(v-if="sort[0] === 'data.' + h" icon="caret-down")
            fontawesome.sorter(v-else-if="sort[0] === '-data.' + h" icon="caret-up")
            fontawesome.sorter.secondary(v-else-if="sort.includes('data.' + h)" icon="caret-down")
            fontawesome.sorter.secondary(v-else-if="sort.includes('-data.' + h)" icon="caret-up")
      tbody
        tr(v-for="d in data" :key="d.cid")
          td(v-for="h in header" :key="h") {{d[h]}}
          td(v-for="h, i in dataHeader" :key="h") {{d.values[i]}}
  b-pagination(:total="count" :current.sync="page" :per-page="perPage")
</template>

<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator'
import { remote } from 'electron'

import { api } from './assets/api'

@Component
export default class App extends Vue {
  data: any[] = []
  count = 0
  page = 1
  perPage = 10
  q = ''
  qTmp = ''
  sort = ['-cid']
  filepath = ''

  header = ['cid', 'deck', 'model', 'template']

  get dataHeader () {
    const d0 = this.data[0]
    return d0 ? d0.keys : [' ']
  }

  @Watch('filepath')
  async init () {
    await api.put('/api/apkg/open', undefined, {
      params: {
        path: this.filepath
      }
    })
    this.load()
  }

  @Watch('q')
  @Watch('page')
  async load () {
    const r = await api.post('/api/cards/q', {
      q: this.q,
      offset: (this.page - 1) * this.perPage,
      limit: this.perPage,
      sort: this.sort
    })

    this.$set(this, 'data', r.data.result)
    this.count = r.data.count
  }

  async openFile () {
    const r = await remote.dialog.showOpenDialog({
      filters: [
        { name: 'APKG database', extensions: ['apkg'] }
      ],
      properties: ['openFile']
    })

    this.filepath = (r.filePaths || [])[0] || ''
  }
}
</script>

<style lang="scss" scoped>
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
  th {
    background-color: rgba(238, 238, 238, 0.5);
    text-align: center;

    &.sortable {
      cursor: pointer;

      &:hover {
        color: blue;
      }
    }

    .sorter {
      margin-left: 0.5em;

      &.secondary {
        color: lightgray;
      }
    }
  }
}
</style>
