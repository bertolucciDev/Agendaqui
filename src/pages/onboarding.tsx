import { Navigate } from 'react-router-dom'

/**
 * DEAD CODE — a rota `/onboarding` redireciona para `/onboarding/business`
 * (ver `src/App.tsx`), então esta página nunca é renderizada.
 *
 * O fluxo antigo criava o negócio com `POST /businesses`, que hoje responde
 * **410 GONE**: a criação de negócios é exclusiva do fluxo de Business
 * Verification (`src/pages/onboarding.business.tsx` → presign/complete de
 * documentos → submit → aprovação administrativa), que cria o Business + um
 * Local + a membership OWNER de forma atômica.
 *
 * A antiga tela e o `OnboardingWizard` foram mantidos apenas como registro;
 * ambos são candidatos a remoção (nenhum importador resta no código).
 */
export default function OnboardingPage() {
  return <Navigate to="/onboarding/business" replace />
}
