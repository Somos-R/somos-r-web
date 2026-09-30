import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AFFECTED, invalidateAffected } from '../../queries/invalidation'
import { linksService } from '../../services/links'
import { getApiErrorMessage } from '../../lib/apiError'
import { interpolate, t } from '../../lib/i18n'

export type Notify = (message: string, severity: 'success' | 'error') => void

/**
 * The four things that change a link. Each one reloads the links AND the directory (which carries
 * the link's state), reports its own result, and on failure reloads too: a refused action usually
 * means the other side already changed it ("that request was already answered").
 */
export function useLinkActions(notify: Notify) {
  const queryClient = useQueryClient()

  function options<V>(mutationFn: (v: V) => Promise<unknown>, success: (v: V) => string) {
    return {
      meta: { silent: true, refreshOnError: AFFECTED.linkChanged },
      mutationFn,
      onSuccess: (_data: unknown, variables: V) => {
        invalidateAffected(queryClient, AFFECTED.linkChanged)
        notify(success(variables), 'success')
      },
      onError: (err: unknown) => notify(getApiErrorMessage(err, t.vinculaciones.messages.actionError), 'error'),
    }
  }

  const request = useMutation(
    options(
      ({ associationId }: { associationId: string; name: string }) => linksService.request(associationId),
      ({ name }) => interpolate(t.vinculaciones.messages.requested, { name }),
    ),
  )
  const accept = useMutation(options((linkId: string) => linksService.accept(linkId), () => t.vinculaciones.messages.accepted))
  const reject = useMutation(
    options(({ linkId, reason }: { linkId: string; reason?: string }) => linksService.reject(linkId, reason), () => t.vinculaciones.messages.rejected),
  )
  // The same endpoint ends an active link and cancels a pending request; only the wording differs.
  const remove = useMutation(
    options(
      ({ linkId }: { linkId: string; cancelling: boolean }) => linksService.remove(linkId),
      ({ cancelling }) => (cancelling ? t.vinculaciones.messages.cancelled : t.vinculaciones.messages.removed),
    ),
  )

  return { request, accept, reject, remove }
}
