import { ResetPasswordPage } from 'heofberu-ui'

export const WithToken = () => <ResetPasswordPage initialEntries={['/reset-password?token=demo-token']} />
export const InvalidLink = () => <ResetPasswordPage initialEntries={['/reset-password']} />
