import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Plus, Trash2, ImagePlus } from 'lucide-react'
import { CATEGORY_ICONS } from './ItemRow'
import { usePhotoUrl } from './RecipePhoto'
import { RECIPE_CATEGORIES, INGREDIENT_ICON_KEYS, parseRecipe, categoryLabel } from '../utils/recipe'

const BLUE = '#0050AA'
const field = 'border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-800 focus:outline-none focus:border-blue-500'

const blankIngredient = () => ({ quantity: '', unit: '', name: '', note: '', iconKey: 'other' })

// Mengen stehen gespeichert mit Punkt ("1.5"); im Feld erscheinen sie in der Schreibweise der Sprache.
const showQuantity = (quantity, lang) => (quantity ? (lang === 'en' ? quantity : String(quantity).replace('.', ',')) : '')

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h3>
      {children}
    </section>
  )
}

function Labeled({ label, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-gray-500">{label}</span>
      {children}
    </label>
  )
}

/**
 * Rezept bearbeiten oder von Hand anlegen (`item` ohne id). Alles ist änderbar; das Foto
 * wird sofort gespeichert bzw. entfernt, der Rest mit „Speichern“.
 */
export default function RecipeEditor({ item, onClose, onSave, onPhoto, onRemovePhoto }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const isNew = !item.id
  const initial = parseRecipe(item)
  const photoUrl = usePhotoUrl(item)
  const photoInput = useRef(null)

  const [name, setName] = useState(item.name ?? '')
  const [category, setCategory] = useState(item.category || 'other')
  const [description, setDescription] = useState(initial.description ?? '')
  const [time, setTime] = useState(initial.time ?? '')
  const [servings, setServings] = useState(initial.servings ?? '')
  const [portions, setPortions] = useState(initial.portions ? String(initial.portions) : '')
  const [label, setLabel] = useState(initial.source.label ?? '')
  const [tags, setTags] = useState(initial.tags.join(', '))
  const [url, setUrl] = useState(initial.source.url ?? '')
  const [notes, setNotes] = useState(initial.notes.join('\n'))
  const [ingredients, setIngredients] = useState(() => {
    const groups = initial.ingredients.map((group) => ({
      title: group.title ?? '',
      items: group.items.map((entry) => ({ ...blankIngredient(), ...entry, quantity: showQuantity(entry.quantity, lang), unit: entry.unit ?? '', note: entry.note ?? '' })),
    }))
    return groups.length ? groups : [{ title: '', items: [blankIngredient()] }]
  })
  const [steps, setSteps] = useState(() => {
    const groups = initial.steps.map((group) => ({ title: group.title ?? '', steps: [...group.steps] }))
    return groups.length ? groups : [{ title: '', steps: [''] }]
  })
  const [saving, setSaving] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [error, setError] = useState('')

  // Ein Feld tief im Baum ändern, ohne den Zustand zu verändern
  const patchIngredient = (g, i, patch) => setIngredients((groups) => groups.map((group, gi) => gi !== g ? group : { ...group, items: group.items.map((entry, ii) => ii !== i ? entry : { ...entry, ...patch }) }))
  const patchGroup = (setter) => (g, patch) => setter((groups) => groups.map((group, gi) => gi !== g ? group : { ...group, ...patch }))
  const patchIngredientGroup = patchGroup(setIngredients)
  const patchStepGroup = patchGroup(setSteps)
  const patchStep = (g, i, value) => setSteps((groups) => groups.map((group, gi) => gi !== g ? group : { ...group, steps: group.steps.map((step, si) => si !== i ? step : value) }))

  async function save() {
    if (!name.trim() || saving) return
    setSaving(true)
    setError('')
    const count = parseInt(portions, 10)
    const content = {
      ...initial,
      description: description.trim() || null,
      time: time.trim() || null,
      servings: servings.trim() || null,
      portions: count > 0 ? count : null,
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      ingredients: ingredients.map((group) => ({
        title: group.title.trim() || null,
        items: group.items.filter((entry) => entry.name.trim()).map((entry) => ({
          quantity: entry.quantity.trim() || null,
          unit: entry.unit.trim() || null,
          name: entry.name.trim(),
          note: entry.note.trim() || null,
          iconKey: entry.iconKey || 'other',
        })),
      })),
      steps: steps.map((group) => ({ title: group.title.trim() || null, steps: group.steps.map((step) => step.trim()).filter(Boolean) })),
      notes: notes.split('\n').map((note) => note.trim()).filter(Boolean),
      source: { ...initial.source, label: label.trim() || null, url: url.trim() || null },
    }
    try {
      await onSave({ name: name.trim(), category, content: JSON.stringify(content) })
    } catch (err) {
      setError(err.response?.data?.error ?? err.message)
      setSaving(false)
    }
  }

  async function changePhoto(picked) {
    if (!picked) return
    setPhotoBusy(true)
    setError('')
    try {
      await onPhoto(picked)
    } catch (err) {
      setError(err.response?.data?.error ?? err.message)
    } finally {
      setPhotoBusy(false)
    }
  }

  const categories = RECIPE_CATEGORIES.includes(category) ? RECIPE_CATEGORIES : [...RECIPE_CATEGORIES, category]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 sm:px-4">
      <div className="bg-white sm:rounded-2xl w-full max-w-2xl shadow-xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col">
        <div className="flex items-center px-5 py-3 border-b border-gray-100 gap-2">
          <button onClick={onClose} className="text-gray-500" aria-label={t('common.close')}><X size={20} /></button>
          <span className="flex-1 font-semibold text-gray-800 truncate">{isNew ? t('recipes.new_title') : t('recipes.edit')}</span>
          <button
            onClick={save}
            disabled={!name.trim() || saving}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: BLUE }}
          >
            {t('common.save')}
          </button>
        </div>

        <div className="px-5 py-4 space-y-5 overflow-y-auto">
          {error && <div className="text-red-600 text-sm">{error}</div>}

          <Section title={t('recipes.section_general')}>
            <input autoFocus={isNew} type="text" value={name} maxLength={255} onChange={(e) => setName(e.target.value)} placeholder={t('recipes.title_label')} className={`${field} w-full font-medium`} />
            <div className="grid grid-cols-2 gap-2">
              <Labeled label={t('recipes.category')}>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${field} w-full`}>
                  {categories.map((key) => <option key={key} value={key}>{categoryLabel(t, key)}</option>)}
                </select>
              </Labeled>
              <Labeled label={t('recipes.time_label')}>
                <input type="text" value={time} maxLength={100} onChange={(e) => setTime(e.target.value)} placeholder={t('recipes.time_placeholder')} className={`${field} w-full`} />
              </Labeled>
              <Labeled label={t('recipes.servings_label')}>
                <input type="text" value={servings} maxLength={100} onChange={(e) => setServings(e.target.value)} placeholder={t('recipes.servings_placeholder')} className={`${field} w-full`} />
              </Labeled>
              <Labeled label={t('recipes.portions_label')}>
                <input type="number" min="1" max="100" value={portions} onChange={(e) => setPortions(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder={t('recipes.portions_placeholder')} className={`${field} w-full`} />
              </Labeled>
            </div>
            <p className="text-xs text-gray-400">{t('recipes.portions_hint')}</p>
            <textarea value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} placeholder={t('recipes.description_placeholder')} rows={2} className={`${field} w-full resize-y`} />
          </Section>

          <Section title={t('recipes.section_labels')}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input type="text" value={label} maxLength={40} onChange={(e) => setLabel(e.target.value)} placeholder={t('recipes.label_placeholder')} className={field} />
              <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t('recipes.tags_placeholder')} className={field} />
            </div>
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t('recipes.source_url_placeholder')} className={`${field} w-full`} />
          </Section>

          {!isNew && (
            <Section title={t('recipes.photo')}>
              <div className="flex items-center gap-3">
                {photoUrl && <img src={photoUrl} alt="" className="w-24 h-24 rounded-lg object-cover" />}
                <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={(e) => { changePhoto(e.target.files?.[0]); e.target.value = '' }} />
                <button type="button" onClick={() => photoInput.current?.click()} disabled={photoBusy} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 disabled:opacity-50">
                  <ImagePlus size={16} />
                  {initial.image ? t('recipes.photo_replace') : t('recipes.photo_add')}
                </button>
                {initial.image && (
                  <button type="button" onClick={async () => { setPhotoBusy(true); try { await onRemovePhoto() } finally { setPhotoBusy(false) } }} disabled={photoBusy} className="text-sm text-red-600 disabled:opacity-50">
                    {t('common.remove')}
                  </button>
                )}
              </div>
            </Section>
          )}

          <Section title={t('recipes.ingredients')}>
            {ingredients.map((group, g) => (
              <div key={g} className="space-y-2 rounded-xl border border-gray-200 p-3">
                <div className="flex gap-2">
                  <input type="text" value={group.title} maxLength={120} onChange={(e) => patchIngredientGroup(g, { title: e.target.value })} placeholder={t('recipes.group_placeholder')} className={`${field} flex-1`} />
                  {ingredients.length > 1 && (
                    <button type="button" onClick={() => setIngredients((groups) => groups.filter((_, gi) => gi !== g))} className="text-red-500 p-2" aria-label={t('recipes.remove_group')}><Trash2 size={16} /></button>
                  )}
                </div>
                {group.items.map((entry, i) => (
                  <div key={i} className="flex flex-wrap gap-1.5 items-center">
                    <input type="text" value={entry.quantity} maxLength={20} onChange={(e) => patchIngredient(g, i, { quantity: e.target.value })} placeholder={t('recipes.quantity')} className={`${field} w-16 px-2 text-right`} />
                    <input type="text" value={entry.unit} maxLength={20} onChange={(e) => patchIngredient(g, i, { unit: e.target.value })} placeholder={t('recipes.unit')} className={`${field} w-20 px-2`} />
                    <input type="text" value={entry.name} maxLength={255} onChange={(e) => patchIngredient(g, i, { name: e.target.value })} placeholder={t('recipes.ingredient')} className={`${field} flex-1 min-w-[7rem]`} />
                    <select value={entry.iconKey} onChange={(e) => patchIngredient(g, i, { iconKey: e.target.value })} className={`${field} px-1`} title={t('items.category_icon')} aria-label={t('items.category_icon')}>
                      {INGREDIENT_ICON_KEYS.map((key) => <option key={key} value={key}>{CATEGORY_ICONS[key]} {t(`items.cat_${key}`)}</option>)}
                    </select>
                    <button type="button" onClick={() => setIngredients((groups) => groups.map((entryGroup, gi) => gi !== g ? entryGroup : { ...entryGroup, items: entryGroup.items.filter((_, ii) => ii !== i) }))} className="text-gray-400 hover:text-red-500 p-1.5" aria-label={t('common.remove')}><X size={16} /></button>
                    <input type="text" value={entry.note} maxLength={255} onChange={(e) => patchIngredient(g, i, { note: e.target.value })} placeholder={t('recipes.ingredient_note')} className={`${field} w-full py-1 text-xs`} />
                  </div>
                ))}
                <button type="button" onClick={() => patchIngredientGroup(g, { items: [...group.items, blankIngredient()] })} className="flex items-center gap-1 text-sm text-blue-700">
                  <Plus size={15} />{t('recipes.add_ingredient')}
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setIngredients((groups) => [...groups, { title: '', items: [blankIngredient()] }])} className="flex items-center gap-1 text-sm text-gray-600">
              <Plus size={15} />{t('recipes.add_group')}
            </button>
          </Section>

          <Section title={t('recipes.preparation')}>
            {steps.map((group, g) => (
              <div key={g} className="space-y-2 rounded-xl border border-gray-200 p-3">
                <div className="flex gap-2">
                  <input type="text" value={group.title} maxLength={120} onChange={(e) => patchStepGroup(g, { title: e.target.value })} placeholder={t('recipes.group_placeholder')} className={`${field} flex-1`} />
                  {steps.length > 1 && (
                    <button type="button" onClick={() => setSteps((groups) => groups.filter((_, gi) => gi !== g))} className="text-red-500 p-2" aria-label={t('recipes.remove_group')}><Trash2 size={16} /></button>
                  )}
                </div>
                {group.steps.map((step, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="w-5 pt-2 text-sm font-semibold text-right" style={{ color: BLUE }}>{i + 1}.</span>
                    <textarea value={step} maxLength={4000} onChange={(e) => patchStep(g, i, e.target.value)} rows={2} className={`${field} flex-1 resize-y`} />
                    <button type="button" onClick={() => patchStepGroup(g, { steps: group.steps.filter((_, si) => si !== i) })} className="text-gray-400 hover:text-red-500 p-1.5 mt-1" aria-label={t('common.remove')}><X size={16} /></button>
                  </div>
                ))}
                <button type="button" onClick={() => patchStepGroup(g, { steps: [...group.steps, ''] })} className="flex items-center gap-1 text-sm text-blue-700">
                  <Plus size={15} />{t('recipes.add_step')}
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setSteps((groups) => [...groups, { title: '', steps: [''] }])} className="flex items-center gap-1 text-sm text-gray-600">
              <Plus size={15} />{t('recipes.add_group')}
            </button>
          </Section>

          <Section title={t('recipes.tips')}>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('recipes.tips_placeholder')} rows={3} className={`${field} w-full resize-y`} />
          </Section>
        </div>
      </div>
    </div>
  )
}
