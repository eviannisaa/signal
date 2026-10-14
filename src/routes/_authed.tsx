import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

/** Layout area private: mengarahkan ke /login jika belum login. Server Function tetap memanggil requireUser(). */
export const Route = createFileRoute('/_authed')({
  beforeLoad: ({ context, location }) => {
    if (!context.user) throw redirect({ to: '/login', search: { redirect: location.href } })
    return { user: context.user }
  },
  component: () => <Outlet />,
})
