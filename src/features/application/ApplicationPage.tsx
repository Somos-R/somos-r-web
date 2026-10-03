import { useUrlToken } from '../auth/useUrlToken'
import ApplicationForm from './ApplicationForm'
import StartApplication from './StartApplication'

/**
 * `/solicitud`, public. Without a token it starts an application; with the token of the emailed link it
 * opens that application to complete and send. The token leaves the address bar at once (it is a credential)
 * and lives only in memory, so reloading the page needs the link again.
 */
export default function ApplicationPage() {
  const token = useUrlToken()
  return token ? <ApplicationForm token={token} /> : <StartApplication />
}
