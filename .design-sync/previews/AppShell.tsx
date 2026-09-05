import { AppShell } from 'heofberu-ui/pages/AppShell.jsx'

export const Desktop = () => <AppShell authenticated isGM />
export const DesktopCollapsed = () => <AppShell authenticated isGM initialCollapsed />
export const LoggedOut = () => <AppShell authenticated={false} />
