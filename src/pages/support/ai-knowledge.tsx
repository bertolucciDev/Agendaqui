import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Sparkles, X } from 'lucide-react'
import { PageContent, PageHeader, PageTitle } from '@/components/ui/page'
import { supportApi } from '@/services/api/support'
import { notify } from '@/lib/notify'

type Draft = { question: string; answer: string }

export default function SupportAiKnowledgePage() {
  const queryClient = useQueryClient()
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const questions = useQuery({
    queryKey: ['support-ai-knowledge'],
    queryFn: supportApi.listAiKnowledgeQuestions,
  })
  const approve = useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: Draft }) => supportApi.approveAiKnowledgeQuestion(id, draft),
    onSuccess: () => {
      notify.success('Resposta aprovada e adicionada ao conhecimento da IA.')
      void queryClient.invalidateQueries({ queryKey: ['support-ai-knowledge'] })
    },
    onError: (error) => notify.error(error),
  })
  const dismiss = useMutation({
    mutationFn: (id: string) => supportApi.dismissAiKnowledgeQuestion(id),
    onSuccess: () => {
      notify.success('Pergunta removida da fila de revisão.')
      void queryClient.invalidateQueries({ queryKey: ['support-ai-knowledge'] })
    },
    onError: (error) => notify.error(error),
  })

  function setDraft(id: string, field: keyof Draft, value: string, initialQuestion: string) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        question: current[id]?.question ?? initialQuestion,
        answer: current[id]?.answer ?? '',
        [field]: value,
      },
    }))
  }

  function submit(event: FormEvent<HTMLFormElement>, id: string, question: string) {
    event.preventDefault()
    const draft = drafts[id] ?? { question, answer: '' }
    if (draft.question.trim().length < 4 || draft.answer.trim().length < 4) return
    approve.mutate({ id, draft: { question: draft.question.trim(), answer: draft.answer.trim() } })
  }

  return (
    <>
      <PageHeader>
        <PageTitle>Conhecimento da IA</PageTitle>
      </PageHeader>
      <PageContent className="mx-auto w-full max-w-4xl space-y-5">
        <section className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p>As perguntas recorrentes aparecem aqui agrupadas. Revise e escreva a resposta oficial; somente depois de aprovada ela poderá orientar novas respostas da IA. Não inclua dados específicos de uma pessoa ou de um negócio: a base é compartilhada no suporte.</p>
          </div>
        </section>

        {questions.isPending ? <p className="text-sm text-muted-foreground">Carregando perguntas…</p> : null}
        {questions.isError ? <p role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">Não foi possível carregar as perguntas para revisão.</p> : null}
        {questions.data?.length === 0 ? <p className="rounded-xl border border-border bg-surface p-5 text-sm text-muted-foreground">Não há perguntas pendentes de revisão.</p> : null}

        <div className="space-y-3">
          {questions.data?.map((item) => {
            const draft = drafts[item.id] ?? { question: item.question, answer: '' }
            const saving = approve.isPending && approve.variables?.id === item.id
            const dismissing = dismiss.isPending && dismiss.variables === item.id
            return (
              <article key={item.id} className="space-y-4 rounded-xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {item.occurrences} ocorrência(s) · última em {new Date(item.lastSeenAt).toLocaleDateString('pt-BR')}
                  </p>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">Aguardando revisão</span>
                </div>
                <form onSubmit={(event) => submit(event, item.id, item.question)} className="space-y-3">
                  <label className="block space-y-1 text-sm">
                    <span className="font-medium text-foreground">Pergunta resumida</span>
                    <textarea
                      value={draft.question}
                      onChange={(event) => setDraft(item.id, 'question', event.target.value, item.question)}
                      maxLength={1000}
                      minLength={4}
                      required
                      rows={2}
                      className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    />
                  </label>
                  <label className="block space-y-1 text-sm">
                    <span className="font-medium text-foreground">Resposta oficial</span>
                    <textarea
                      value={draft.answer}
                      onChange={(event) => setDraft(item.id, 'answer', event.target.value, item.question)}
                      maxLength={4000}
                      minLength={4}
                      required
                      rows={3}
                      placeholder="Escreva uma resposta que a IA poderá usar como referência."
                      className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    />
                  </label>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => dismiss.mutate(item.id)}
                      disabled={saving || dismissing}
                      className="btn btn-outline inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" /> Descartar
                    </button>
                    <button
                      type="submit"
                      disabled={saving || dismissing || draft.answer.trim().length < 4}
                      className="btn btn-primary inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" /> {saving ? 'Salvando…' : 'Aprovar resposta'}
                    </button>
                  </div>
                </form>
              </article>
            )
          })}
        </div>
      </PageContent>
    </>
  )
}
