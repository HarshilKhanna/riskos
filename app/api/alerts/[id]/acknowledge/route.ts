import { auth } from '@clerk/nextjs/server'
import { applyClerkRls, getSupabaseAdminClient } from '@/lib/supabase/client'

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ message: 'Unauthorized' }, { status: 403 })
  }

  const { id: alertId } = await context.params
  if (!alertId?.trim()) {
    return Response.json({ message: 'Missing alert id.' }, { status: 400 })
  }

  const supabase = getSupabaseAdminClient()
  await applyClerkRls(userId)

  const { data: alert, error: alertErr } = await supabase
    .from('alerts')
    .select('alert_id,user_id,acknowledged')
    .eq('alert_id', alertId)
    .single()

  if (alertErr || !alert) {
    return Response.json({ message: 'Alert not found.' }, { status: 404 })
  }

  if (alert.user_id !== userId) {
    return Response.json({ message: 'Forbidden.' }, { status: 403 })
  }

  if (alert.acknowledged) {
    return Response.json({ success: true }, { status: 200 })
  }

  const { error } = await supabase
    .from('alerts')
    .update({
      acknowledged: true,
      acknowledged_at: new Date().toISOString(),
    })
    .eq('alert_id', alertId)

  if (error) {
    return Response.json(
      { message: 'Failed to acknowledge alert.', details: error.message },
      { status: 500 }
    )
  }

  return Response.json({ success: true }, { status: 200 })
}
