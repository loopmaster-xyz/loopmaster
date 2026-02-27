import { session } from '../state.ts'
import { Artist } from './Artist.tsx'
import { AuthForm } from './AuthForm.tsx'

export const Account = () => {
  if (session.value) {
    return <Artist session={session.value} />
  }
  else {
    return <AuthForm placement="top" showBoth />
  }
}
