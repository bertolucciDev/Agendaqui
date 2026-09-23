import { mockApi } from '/home/inetserver/agendaqui-web/src/api/mock/index.ts';
import { MOCK_USERS, resetDb } from '/home/inetserver/agendaqui-web/src/api/mock/store.ts';

const mem: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v; },
  removeItem: (k: string) => { delete mem[k]; },
};

async function main() {
  resetDb();
  const errors: string[] = [];

  const check = (name: string, cond: boolean) => {
    if (cond) console.log(`  ok  ${name}`);
    else errors.push(name);
  };

  // fluxo login
  const tokens = await mockApi.login({ email: MOCK_USERS.owner.email, password: MOCK_USERS.owner.password });
  check('login owner', !!tokens.accessToken);
  const me = await mockApi.me();
  check('me retorna perfil', me.email === MOCK_USERS.owner.email);

  // negócios
  const biz = await mockApi.getMyBusinesses();
  check('getMyBusinesses 1 negócio', biz.length === 1 && biz[0].role === 'OWNER');
  const pub = await mockApi.getBusinessBySlug('barbearia-joao');
  check('slug público com locais/serviços', (pub.locations?.length ?? 0) === 2 && (pub.services?.length ?? 0) === 3);

  // criar negócio
  const novo = await mockApi.createBusiness({
    name: 'Clínica Vida',
    document: '11122233344',
    type: 'INDIVIDUAL',
    categoryId: 'cat_saude',
    locationName: 'Unidade Centro',
    address: 'Rua X, 10',
    timezone: 'America/Sao_Paulo',
  });
  check('criar negócio gera slug', novo.slug.includes('clinica'));

  // categorias
  const cats = await mockApi.getCategories();
  check('categorias em árvore', cats.length === 2 && cats[0].children.length > 0);

  // serviços
  const svc = await mockApi.createService('b_barbearia', {
    categoryId: 'cat_corte', name: 'Corte infantil', priceCents: 3990, durationMinutes: 30,
  });
  await mockApi.addServiceProfessional(svc.id, 'mem_pedro');
  const services = await mockApi.getServices('b_barbearia');
  check('serviço com profissional', services.find(s => s.id === svc.id)?.professionals.length === 1);

  // locais + feriados
  const hol = await mockApi.createHoliday('loc_matriz', { date: '2026-09-07', name: 'Independência' });
  const hols = await mockApi.getHolidays('loc_matriz');
  check('feriado criado', hols.length === 3 && hols.some(h => h.id === hol.id));

  // funcionários
  const inv = await mockApi.inviteEmployee('b_barbearia', {
    email: 'novo@email.com', locationId: 'loc_matriz', role: 'EMPLOYEE', position: 'Aprendiz',
  });
  check('convite gerado', inv.code.length === 6);
  const mem2 = await mockApi.linkEmployeeToLocation('loc_matriz', {
    userId: 'u_customer', role: 'EMPLOYEE', position: 'Caixa',
  });
  check('vínculo por local', mem2.role === 'EMPLOYEE');
  await mockApi.fireEmployee(mem2.id);
  const emps = await mockApi.getEmployees('b_barbearia');
  check('demitido sai da lista', !emps.some(e => e.id === mem2.id));

  // horários
  const wh = await mockApi.upsertWorkingHours('mem_pedro', {
    entries: [{ dayOfWeek: 'MONDAY', startMinute: 540, endMinute: 1080 }],
  });
  check('working hours upsert', wh.length === 1 && wh[0].startMinute === 540);

  await mockApi.login({ email: MOCK_USERS.employee.email, password: MOCK_USERS.employee.password });
  // afastamentos
  const to = await mockApi.requestTimeOff('mem_pedro', {
    type: 'VACATION', startAt: '2026-09-01T09:00:00.000Z', endAt: '2026-09-10T18:00:00.000Z', reason: 'Férias',
  });
  check('time-off solicitado', to.status === 'PENDING');
  await mockApi.login({ email: MOCK_USERS.owner.email, password: MOCK_USERS.owner.password });
  const ap = await mockApi.approveTimeOff(to.id);
  check('time-off aprovado', ap.status === 'APPROVED');
  await mockApi.rejectTimeOff('to_pending');
  const tos = await mockApi.getTimeOffs('b_barbearia');
  check('lista afastamentos', tos.length >= 2);

  // perfil cliente / admin
  await mockApi.login({ email: MOCK_USERS.customer.email, password: MOCK_USERS.customer.password });
  const cp = await mockApi.getCustomerProfile();
  check('perfil cliente', cp.reputationScore === 100);
  const bks = await mockApi.getMyAppointments();
  check('reservas mock', bks.length >= 3 && bks.some((b) => b.status === 'CONFIRMED'));
  const upgrades = await mockApi.getAppointment('bk_1');
  check('reserva por id', upgrades.priceCents === 4900);
  const pendingCount = await mockApi.getMyAppointments({ status: 'PENDING' });
  check('filtro por status', pendingCount.length === 1);
  await mockApi.login({ email: MOCK_USERS.owner.email, password: MOCK_USERS.owner.password });
  const bizAppts = await mockApi.getBusinessAppointments('b_barbearia');
  check('reservas do negócio', bizAppts.length >= 4);

  // ciclo de status na agenda (owner confirma em nome do time)
  const pending = bizAppts.find((a) => a.status === 'PENDING' && a.employeeMembershipId);
  check('há reserva pendente p/ confirmar', !!pending);
  if (pending) {
    const confirmed = await mockApi.confirmAppointment(pending.id, { employeeMembershipId: pending.employeeMembershipId! });
    check('owner confirma reserva', confirmed.status === 'CONFIRMED');
    const completed = await mockApi.completeAppointment(pending.id, { employeeMembershipId: pending.employeeMembershipId! });
    check('reserva concluída', completed.status === 'COMPLETED');
    await mockApi.cancelAppointment('bk_1', { reason: 'Cliente não pôde comparecer.' });
    const after = await mockApi.getAppointment('bk_1');
    check('cancelamento com motivo', after.status === 'CANCELLED' && !!after.cancellationReason);
  }
  const d = new Date();
  const diff = (d.getDay() === 1 ? 0 : ((1 - d.getDay() + 7) % 7));
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  const fmt = (x: Date) => x.toISOString().slice(0, 10);
  const slots = await mockApi.getSlots('b_barbearia', { dateFrom: fmt(mon), dateTo: fmt(mon) });
  check('slots por dia', Object.keys(slots).length >= 1);
  const agenda = await mockApi.getAgenda({});
  check('agenda do time', Array.isArray(agenda));
  const tosMe = await mockApi.getMyTimeOffs();
  check('meus afastamentos (cliente: vazio)', tosMe.length === 0);

  // fluxo página pública: serviços -> slots -> criar reserva
  await mockApi.login({ email: MOCK_USERS.customer.email, password: MOCK_USERS.customer.password });
  const pubServices = await mockApi.getPublicServices('barbearia-joao');
  check('serviços públicos paginados', pubServices.total >= 3 && pubServices.data.length >= 3);
  const withPro = pubServices.data.find(s => s.professionals.length > 0) ?? pubServices.data[0];
  const s2 = await mockApi.getSlots('b_barbearia', { serviceId: withPro.id, dateFrom: fmt(mon), dateTo: fmt(mon) });
  check('slots por serviço', Object.keys(s2).length >= 1);
  const firstSlot = s2[fmt(mon)][0];
  const created = await mockApi.createAppointment('b_barbearia', {
    locationId: 'loc_matriz',
    serviceId: withPro.id,
    startsAt: firstSlot.startAt,
    endsAt: firstSlot.endAt,
    employeeMembershipId: firstSlot.professionalId ?? undefined,
  });
  check('reserva criada (pendente)', created.status === 'PENDING' && created.customer?.id === 'u_customer');
  const mineNow = await mockApi.getMyAppointments();
  check('reserva aparece nas minhas', mineNow.some(a => a.id === created.id));

  // erros
  await mockApi.login({ email: MOCK_USERS.owner.email, password: 'errada' }).catch((e: any) => {
    check('login senha errada -> 401', e.statusCode === 401);
  });
  await mockApi.logout();
  await mockApi.me().catch((e: any) => {
    check('me sem sessão -> 401', e.statusCode === 401);
  });

  if (errors.length) {
    console.log(`\nFALHAS (${errors.length}): ${errors.join(', ')}`);
    process.exit(1);
  }
  console.log('\nMock smoke test: tudo passou');
}

main().catch((e) => { console.error('ERRO:', e); process.exit(1); });
