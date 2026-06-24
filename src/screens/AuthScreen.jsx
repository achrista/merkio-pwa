import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import api, { setTokens } from '../api/client'
import i18n from '../i18n/index.js'

const BLUE = '#0050AA'
const YELLOW = '#FFF000'

const LANGS = ['de', 'en', 'fr']

export default function AuthScreen({ onSuccess }) {
  const { t } = useTranslation()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [locale, setLocale] = useState(i18n.language?.split('-')[0] ?? 'de')
  const [groupMode, setGroupMode] = useState('none')
  const [inviteCode, setInviteCode] = useState('')
  const [groupName, setGroupName] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [needsVerification, setNeedsVerification] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !password) return setError(t('auth.enter_email_password'))
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/login', { email, password })
      setTokens(res.data.accessToken, res.data.refreshToken)
      localStorage.setItem('locale', res.data.user?.locale ?? locale)
      i18n.changeLanguage(res.data.user?.locale ?? locale)
      onSuccess()
    } catch (err) {
      const status = err.response?.status
      if (status === 401) setError(t('auth.wrong_credentials'))
      else if (status === 403) {
        setNeedsVerification(true)
        setError(t('auth.verify_email_hint'))
      } else if (!err.response) setError(t('auth.no_server_response'))
      else setError(t('auth.login_failed', { code: status }))
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    if (!email || !name || !password) return setError(t('auth.enter_all_fields'))
    if (password.length < 8) return setError(t('auth.password_too_short'))
    setLoading(true)
    setError('')
    try {
      const body = { email, shortName: name, password, locale }
      if (groupMode === 'join') body.inviteCode = inviteCode
      if (groupMode === 'create') body.groupName = groupName || name
      await api.post('/auth/register', body)
      setInfo(t('auth.register_success'))
      setMode('login')
    } catch (err) {
      const status = err.response?.status
      const msg = err.response?.data?.error ?? ''
      if (msg.includes('bereits') || msg.includes('taken') || msg.includes('already')) setError(t('auth.email_taken'))
      else if (msg.includes('Gruppe') || msg.includes('group')) setError(t('auth.group_not_found'))
      else if (!err.response) setError(t('auth.no_server_response'))
      else setError(t('auth.register_failed', { code: status }))
    } finally {
      setLoading(false)
    }
  }

  async function handleResendVerification() {
    try {
      await api.post('/auth/resend-verification', { email })
      setInfo(t('auth.verification_resent'))
    } catch {
      setError(t('auth.connection_failed', { msg: '' }))
    }
  }

  function switchLang(lang) {
    setLocale(lang)
    i18n.changeLanguage(lang)
    localStorage.setItem('locale', lang)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6" style={{ backgroundColor: BLUE }}>
          <h1 className="text-white text-2xl font-bold text-center">Merkio</h1>
          <p className="text-blue-200 text-center text-sm mt-1">
            {mode === 'login' ? t('auth.login') : t('auth.register')}
          </p>
        </div>

        <form
          onSubmit={mode === 'login' ? handleLogin : handleRegister}
          className="px-8 py-6 space-y-4"
        >
          {info && (
            <div className="bg-green-50 text-green-700 rounded-lg px-4 py-3 text-sm">{info}</div>
          )}
          {error && (
            <div className="bg-red-50 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
          )}

          <input
            type="email"
            placeholder={t('auth.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
          />

          {mode === 'register' && (
            <input
              type="text"
              placeholder={t('auth.short_name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
            />
          )}

          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              placeholder={t('auth.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-20 text-sm focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500"
            >
              {showPw ? t('auth.hide_password') : t('auth.show_password')}
            </button>
          </div>

          {mode === 'register' && (
            <>
              {/* Language */}
              <div>
                <div className="text-xs text-gray-500 mb-1">{t('auth.language')}</div>
                <div className="flex gap-2">
                  {LANGS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => switchLang(l)}
                      className="flex-1 py-1.5 rounded-full text-sm font-medium border transition-colors"
                      style={locale === l
                        ? { backgroundColor: BLUE, color: '#fff', borderColor: BLUE }
                        : { backgroundColor: '#fff', color: '#666', borderColor: '#ddd' }}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Group mode */}
              <div>
                <div className="text-xs text-gray-500 mb-1">{t('auth.group')}</div>
                <div className="space-y-1">
                  {[
                    ['none', t('auth.group_none')],
                    ['join', t('auth.group_join')],
                    ['create', t('auth.group_create')],
                  ].map(([val, label]) => (
                    <label key={val} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="groupMode"
                        value={val}
                        checked={groupMode === val}
                        onChange={() => setGroupMode(val)}
                        style={{ accentColor: BLUE }}
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
                {groupMode === 'join' && (
                  <input
                    type="text"
                    placeholder={t('auth.invite_code')}
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="w-full mt-2 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                )}
                {groupMode === 'create' && (
                  <input
                    type="text"
                    placeholder={t('auth.group_name_optional')}
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full mt-2 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                )}
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60"
            style={{ backgroundColor: BLUE, color: '#fff' }}
          >
            {loading
              ? (mode === 'login' ? t('auth.logging_in') : t('auth.registering'))
              : (mode === 'login' ? t('auth.login') : t('auth.register'))
            }
          </button>

          {needsVerification && (
            <button
              type="button"
              onClick={handleResendVerification}
              className="w-full text-sm text-blue-600 underline text-center"
            >
              {t('auth.resend_verification')}
            </button>
          )}

          <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setInfo('') }}
            className="w-full text-sm text-center"
            style={{ color: BLUE }}
          >
            {mode === 'login' ? t('auth.switch_to_register') : t('auth.switch_to_login')}
          </button>
        </form>
      </div>
    </div>
  )
}
