import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import 'katex/dist/katex.min.css'
import 'katex/contrib/mhchem'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout,
}
