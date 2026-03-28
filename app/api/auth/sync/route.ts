import { auth, currentUser } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function POST(_req: Request) {
  try {
    const { userId } = await auth()

    // Debug: log what Clerk sees in this API context.
    console.log('Clerk userId:', userId)

    if (!userId) {
      return Response.json(
        { error: 'Unauthorized', hint: 'No userId from Clerk' },
        { status: 401 }
      )
    }

    const user = await currentUser()

    if (!user) {
      return Response.json(
        { error: 'Unauthorized', hint: 'No user from Clerk' },
        { status: 401 }
      )
    }

    const { data: role } = await supabaseAdmin
      .from('roles')
      .select('role_id')
      .eq('role_name', 'investor')
      .single()

    const { error } = await supabaseAdmin.from('users').upsert(
      {
        user_id: userId,
        name: user.fullName,
        email: user.emailAddresses[0]?.emailAddress ?? null,
        role_id: role?.role_id,
        last_login: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    if (error) {
      console.error('Supabase error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, userId })
  } catch (err) {
    console.error('Sync error:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}

