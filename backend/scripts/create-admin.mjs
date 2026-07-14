import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import ws from 'ws';

const EMAIL = 'admin@autohistory.app';
const PASSWORD = 'Admin@AutoHistory2026';
const NAME = 'Platform Admin';

const prisma = new PrismaClient();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: typeof WebSocket === 'undefined' ? ws : WebSocket },
});

async function main() {
  const { data: listed, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listErr) throw listErr;

  let authUser = listed.users.find((u) => u.email?.toLowerCase() === EMAIL) || null;

  if (authUser) {
    const { data, error } = await supabase.auth.admin.updateUserById(authUser.id, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: NAME, role: 'ADMIN' },
    });
    if (error) throw error;
    authUser = data.user;
    console.log('Updated Supabase auth user');
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: NAME, role: 'ADMIN' },
    });
    if (error) throw error;
    authUser = data.user;
    console.log('Created Supabase auth user');
  }

  const byId = await prisma.user.findUnique({ where: { id: authUser.id } });
  const byEmail = await prisma.user.findUnique({ where: { email: EMAIL } });

  if (byEmail && byEmail.id !== authUser.id) {
    await prisma.user.delete({ where: { id: byEmail.id } });
  }

  if (byId) {
    await prisma.user.update({
      where: { id: authUser.id },
      data: { email: EMAIL, fullName: NAME, role: 'ADMIN', banned: false, deletedAt: null },
    });
  } else {
    await prisma.user.create({
      data: {
        id: authUser.id,
        email: EMAIL,
        fullName: NAME,
        role: 'ADMIN',
      },
    });
  }

  const final = await prisma.user.findUnique({ where: { id: authUser.id } });
  console.log(
    JSON.stringify(
      {
        email: EMAIL,
        password: PASSWORD,
        id: final.id,
        role: final.role,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
