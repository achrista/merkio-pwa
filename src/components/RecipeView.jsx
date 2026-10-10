import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShoppingCart, Pencil, Trash2, FileDown, FileText, Clock, Users, ExternalLink } from 'lucide-react'
import ScreenHeader from './ScreenHeader'
import { usePhotoUrl, downloadFile, fileName } from './RecipePhoto'
import RecipePortions, { defaultAmount, factorOf } from './RecipePortions'
import { parseRecipe, categoryLabel, formatAmount, RECIPE_CATEGORY_ICONS } from '../utils/recipe'

const BLUE = '#0050AA'
const YELLOW = '#FFF000'

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

/** Ein einzelnes Rezept: Foto, Kopfdaten, Zutaten für die gewählte Menge, Zubereitung. */
export default function RecipeView({ item, onBack, onEdit, onTrash, onShopping }) {
  const { t, i18n } = useTranslation()
  const content = useMemo(() => parseRecipe(item), [item])
  const photoUrl = usePhotoUrl(item)
  const [amount, setAmount] = useState(() => defaultAmount(content))
  const [exporting, setExporting] = useState(false)
  const factor = factorOf(content, amount)

  async function exportAs(kind) {
    setExporting(true)
    try {
      const base = fileName(item.name)
      if (kind === 'pdf') {
        await downloadFile(`/items/${item.id}/export.pdf`, content.portions ? { portions: amount } : { factor }, `${base}.pdf`)
      } else {
        // Culinola liest die Rezeptdatei und sucht das Foto unter demselben Namen daneben
        await downloadFile(`/items/${item.id}/export.md`, {}, `${base}.md`)
        if (content.image) await downloadFile(`/items/${item.id}/photo`, { download: 1 }, `${base}.jpg`)
      }
    } catch (err) {
      console.error('export failed', err)
    } finally {
      setExporting(false)
    }
  }

  const action = (onClick, Icon, text, extra = '') => (
    <button onClick={onClick} disabled={exporting} title={text} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 ${extra}`}>
      <Icon size={16} />
      <span className="hidden sm:inline">{text}</span>
    </button>
  )

  return (
    <div className="flex flex-col h-full">
      <ScreenHeader
        title={item.name}
        onBack={onBack}
        actions={(size) => (
          <button onClick={onEdit} title={t('recipes.edit')} aria-label={t('recipes.edit')}><Pencil size={size} /></button>
        )}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-5">
          {photoUrl && <img src={photoUrl} alt={item.name} className="w-full max-h-80 object-cover rounded-2xl" />}

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-gray-800">{item.name}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
              <span>{RECIPE_CATEGORY_ICONS[item.category] ?? '📖'} {categoryLabel(t, item.category)}</span>
              {content.time && <span className="flex items-center gap-1"><Clock size={14} />{content.time}</span>}
              {content.servings && <span className="flex items-center gap-1"><Users size={14} />{content.servings}</span>}
            </div>
            {(content.source.label || content.tags.length > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {content.source.label && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: YELLOW, color: BLUE }}>{content.source.label}</span>
                )}
                {content.tags.map((tag) => (
                  <span key={tag} className="px-2.5 py-0.5 rounded-full text-xs border" style={{ color: 'var(--pill-fg)', borderColor: 'var(--pill-border)' }}>{tag}</span>
                ))}
              </div>
            )}
            {content.description && <p className="text-sm text-gray-600 italic">{content.description}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => onShopping(amount)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: BLUE }}>
              <ShoppingCart size={16} />
              {t('recipes.to_shopping_list')}
            </button>
            {action(() => exportAs('pdf'), FileText, t('recipes.export_pdf'))}
            {action(() => exportAs('md'), FileDown, t('recipes.export_culinola'))}
            {action(onTrash, Trash2, t('common.delete'), 'text-red-600')}
          </div>

          {content.ingredients.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-blue-800">{t('recipes.ingredients')}</h2>
              <RecipePortions content={content} amount={amount} onChange={setAmount} />
              {content.ingredients.map((group, g) => (
                <div key={g}>
                  {group.title && <h3 className="text-sm font-semibold text-gray-700 mt-2 mb-1">{group.title}</h3>}
                  <table className="w-full text-sm">
                    <tbody>
                      {group.items.map((ingredient, i) => (
                        <tr key={i} className="border-b border-gray-100 last:border-0">
                          <td className="py-1.5 pr-3 text-right font-semibold text-gray-800 whitespace-nowrap align-top w-28">{formatAmount(ingredient, factor, i18n.language)}</td>
                          <td className="py-1.5 text-gray-800">
                            {ingredient.name}
                            {ingredient.note && <span className="text-gray-400"> ({ingredient.note})</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </section>
          )}

          {content.steps.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-blue-800">{t('recipes.preparation')}</h2>
              {content.steps.map((group, g) => (
                <div key={g}>
                  {group.title && <h3 className="text-sm font-semibold text-gray-700 mt-2 mb-1">{group.title}</h3>}
                  <ol className="space-y-2.5">
                    {group.steps.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm text-gray-800 leading-relaxed">
                        <span className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white mt-0.5" style={{ backgroundColor: BLUE }}>{i + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </section>
          )}

          {content.notes.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-blue-800">{t('recipes.tips')}</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                {content.notes.map((note, i) => <li key={i}>{note}</li>)}
              </ul>
            </section>
          )}

          {content.source.url && (
            <a href={content.source.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-blue-700 break-all">
              <ExternalLink size={14} className="shrink-0" />
              {t('recipes.source')}: {hostOf(content.source.url)}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
