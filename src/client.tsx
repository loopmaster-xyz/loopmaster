import { render } from 'preact'
import { App } from './components/App.tsx'
import './router.tsx'

render(<App />, document.getElementById('app')!)
