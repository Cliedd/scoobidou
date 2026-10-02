import { redirect } from 'next/navigation'; import { currentUser } from '../../lib/auth'; import AdminDashboard from './ui';
export default async function AdminPage(){const u=await currentUser();if(!u||!['editor','admin'].includes(u.role))redirect('/');return <AdminDashboard role={u.role} email={u.email}/>;}
