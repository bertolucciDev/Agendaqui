# Matriz API → Frontend — Agendaqui

## Autenticação

| Endpoint | Método | Feature | Página | Componente | Query/Mutation |
|----------|--------|---------|--------|------------|----------------|
| `/auth/login` | POST | Login | LoginPage | LoginForm | useMutation |
| `/auth/refresh-token` | POST | Refresh Token | — | apiClient interceptor | useMutation |
| `/auth/logout` | POST | Logout | — | useLogout | useMutation |
| `/auth/logout-all` | POST | Logout All | SettingsPage | useLogoutAll | useMutation |
| `/auth/forgot-password` | POST | Esqueci Senha | ForgotPasswordPage | ForgotPasswordForm | useMutation |
| `/auth/reset-password` | POST | Resetar Senha | ResetPasswordPage | ResetPasswordForm | useMutation |
| `/auth/verify-email` | POST | Verificar Email | VerifyEmailPage | VerifyEmailForm | useMutation |
| `/auth/first-access/set-password` | POST | Primeiro Acesso | FirstAccessPage | SetPasswordForm | useMutation |
| `/auth/create-temp-session` | POST | Criar Sessão | FirstAccessPage | useCreateTempSession | useMutation |
| `/auth/me` | GET | Dados Usuário | — | useCurrentUser | useQuery |
| `/auth/accept-invite` | POST | Aceitar Convite | AcceptInvitePage | AcceptInviteForm | useMutation |

## Cadastro

| Endpoint | Método | Feature | Página | Componente | Query/Mutation |
|----------|--------|---------|--------|------------|----------------|
| `/users` | POST | Registro | RegisterPage | RegisterForm | useMutation |

## Categorias

| Endpoint | Método | Feature | Página | Componente | Query/Mutation |
|----------|--------|---------|--------|------------|----------------|
| `/categories` | GET | Listar Categorias | BusinessForm | CategorySelect | useQuery |
| `/categories` | POST | Criar Categoria | AdminPage | CategoryForm | useMutation |
| `/categories/{id}` | DELETE | Deletar Categoria | AdminPage | CategoryList | useMutation |

## Negócios

| Endpoint | Método | Feature | Página | Componente | Query/Mutation |
|----------|--------|---------|--------|------------|----------------|
| `/businesses` | POST | Criar Negócio | CreateBusinessPage | BusinessForm | useMutation |
| `/businesses/{id}` | PUT | Editar Negócio | SettingsPage | BusinessForm | useMutation |
| `/businesses/{id}` | DELETE | Deletar Negócio | SettingsPage | useDeleteBusiness | useMutation |
| `/businesses/{slug}` | GET | Perfil Público | PublicBusinessPage | BusinessProfile | useQuery |
| `/businesses/{slug}/services` | GET | Serviços Públicos | PublicBusinessPage | ServiceList | useQuery |

## Locais

| Endpoint | Método | Feature | Página | Componente | Query/Mutation |
|----------|--------|---------|--------|------------|----------------|
| `/businesses/{businessId}/locations` | POST | Criar Local | LocationsPage | LocationForm | useMutation |
| `/locations/{id}` | PUT | Editar Local | LocationsPage | LocationForm | useMutation |
| `/locations/{id}` | DELETE | Deletar Local | LocationsPage | LocationList | useMutation |
| `/locations/{id}/holidays` | POST | Criar Feriado | LocationDetailPage | HolidayForm | useMutation |
| `/holidays/{id}` | DELETE | Deletar Feriado | LocationDetailPage | HolidayList | useMutation |

## Serviços

| Endpoint | Método | Feature | Página | Componente | Query/Mutation |
|----------|--------|---------|--------|------------|----------------|
| `/businesses/{businessId}/services` | POST | Criar Serviço | ServicesPage | ServiceForm | useMutation |
| `/services/{id}` | PUT | Editar Serviço | ServicesPage | ServiceForm | useMutation |
| `/services/{id}` | DELETE | Deletar Serviço | ServicesPage | ServiceList | useMutation |

## Funcionários

| Endpoint | Método | Feature | Página | Componente | Query/Mutation |
|----------|--------|---------|--------|------------|----------------|
| `/locations/{locationId}/employees` | POST | Adicionar Funcionário | StaffPage | EmployeeForm | useMutation |
| `/employees/{employeeMembershipId}` | PUT | Editar Funcionário | StaffPage | EmployeeForm | useMutation |
| `/employees/{employeeMembershipId}` | DELETE | Demitir Funcionário | StaffPage | EmployeeList | useMutation |
| `/employees/{employeeMembershipId}/working-hours` | PUT | Definir Horários | StaffPage | WorkingHoursForm | useMutation |
| `/employees/{employeeMembershipId}/time-offs` | POST | Solicitar Afastamento | StaffPage | TimeOffForm | useMutation |
| `/time-offs/{id}/approve` | PUT | Aprovar Afastamento | StaffPage | TimeOffList | useMutation |
| `/time-offs/{id}/reject` | PUT | Rejeitar Afastamento | StaffPage | TimeOffList | useMutation |
| `/services/{serviceId}/professionals` | POST | Atribuir Profissional | ServiceDetailPage | ProfessionalAssign | useMutation |
| `/services/{serviceId}/professionals` | DELETE | Remover Profissional | ServiceDetailPage | ProfessionalList | useMutation |
| `/businesses/{businessId}/invites` | POST | Convidar Funcionário | StaffPage | InviteForm | useMutation |
| `/auth/accept-invite` | POST | Aceitar Convite | AcceptInvitePage | AcceptInviteForm | useMutation |

## Agendamentos

| Endpoint | Método | Feature | Página | Componente | Query/Mutation |
|----------|--------|---------|--------|------------|----------------|
| `/businesses/{businessId}/appointments` | POST | Criar Agendamento | BookingPage | AppointmentForm | useMutation |
| `/businesses/{businessId}/appointments` | GET | Listar Agendamentos | AppointmentsPage | AppointmentList | useQuery |
| `/appointments/{id}/confirm` | PATCH | Confirmar | AppointmentsPage | AppointmentActions | useMutation |
| `/appointments/{id}/cancel` | PATCH | Cancelar | AppointmentsPage | AppointmentActions | useMutation |
| `/appointments/{id}/complete` | PATCH | Concluir | AppointmentsPage | AppointmentActions | useMutation |
| `/appointments/{id}/no-show` | PATCH | Não Compareceu | AppointmentsPage | AppointmentActions | useMutation |
| `/businesses/{businessId}/slots` | GET | Slots Disponíveis | BookingPage | SlotPicker | useQuery |
| `/me/appointments` | GET | Meus Agendamentos | MyAppointmentsPage | AppointmentList | useQuery |
| `/me/agenda` | GET | Minha Agenda | MyAgendaPage | AgendaView | useQuery |
| `/appointments/{id}` | GET | Detalhe Agendamento | AppointmentDetailPage | AppointmentDetail | useQuery |

## Me (Perfis)

| Endpoint | Método | Feature | Página | Componente | Query/Mutation |
|----------|--------|---------|--------|------------|----------------|
| `/me/customer-profile` | GET | Perfil Cliente | ProfilePage | CustomerProfile | useQuery |
| `/me/admin-profile` | GET | Perfil Admin | AdminPage | AdminProfile | useQuery |

## Platform Config

| Endpoint | Método | Feature | Página | Componente | Query/Mutation |
|----------|--------|---------|--------|------------|----------------|
| `/platform-config` | GET | Config Plataforma | AdminPage | PlatformConfig | useQuery |
| `/platform-config` | PUT | Editar Config | AdminPage | ConfigForm | useMutation |
