import Vue from 'vue'

import App from './App.vue'

import './plugins/buefy'
import './plugins/fontawesome'
import './plugins/context'

Vue.directive('clickoutside', {
  bind (el, binding, vnode: any) {
    (el as any).clickOutsideEvent = (event: any) => {
      // here I check that click was outside the el and his childrens
      if (!(el.parentElement === event.target || el.parentElement?.contains(event.target))) {
        // and if it did, call method provided in attribute value
        vnode.context[binding.expression](event)
      }
    }
    document.body.addEventListener('click', (el as any).clickOutsideEvent)
  },
  unbind (el: any) {
    document.body.removeEventListener('click', el.clickOutsideEvent)
  }
})

Vue.config.productionTip = false

new Vue({
  render: h => h(App)
}).$mount('#app')
