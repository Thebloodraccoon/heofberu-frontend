import { useRef, useState } from 'react'

export default function useSaveStatus() {
  const [statuses, setStatuses] = useState({})
  const versions = useRef({})
  const run = async (key, task) => {
    const version = (versions.current[key] ?? 0) + 1
    versions.current[key] = version
    const update = (status) => {
      if (versions.current[key] === version) setStatuses((current) => ({ ...current, [key]: status }))
    }
    update({ state: 'saving' })
    try {
      await task()
      update({ state: 'saved' })
      return true
    } catch (error) {
      update({ state: 'error', error, retry: () => run(key, task) })
      return false
    }
  }
  const clear = (key) => {
    versions.current[key] = (versions.current[key] ?? 0) + 1
    setStatuses((current) => ({ ...current, [key]: undefined }))
  }
  return { statuses, run, clear }
}
