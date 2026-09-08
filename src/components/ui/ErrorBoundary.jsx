import { Component } from 'react'
import { Button } from './primitives.jsx'

export class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Необработанная ошибка рендера:', error, info)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
          <p className="font-display text-lg font-bold text-stone-100">Что-то пошло не так</p>
          <p className="text-sm text-stone-400">
            Страница столкнулась с неожиданной ошибкой. Попробуйте обновить её.
          </p>
          <Button onClick={this.reset}>Попробовать снова</Button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
