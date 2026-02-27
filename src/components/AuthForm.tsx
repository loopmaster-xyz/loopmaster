import {
  CircleNotchIcon,
  ExclamationMarkIcon,
  PencilSimpleLineIcon,
  SignInIcon,
} from '@phosphor-icons/react'
import { useSignal } from '@preact/signals'
import { api } from '../api.ts'
import { useReactiveEffect } from '../hooks/useReactiveEffect.ts'
import { session } from '../state.ts'
import { SidebarButton } from './SidebarButton.tsx'

const Error = ({ message }: { message: string }) => (
  <p class="text-red-500 text-sm flex items-center">
    <ExclamationMarkIcon size={16} class="inline-block mr-1" /> {message}
  </p>
)

export const AuthForm = ({ showBoth = false, placement }: { showBoth?: boolean; placement: 'top' | 'bottom' }) => {
  const mode = useSignal<'login' | 'register' | 'both'>(showBoth ? 'both' : 'login')

  const loginEmail = useSignal('')
  const loginPassword = useSignal('')
  const loginErrorMessage = useSignal('')
  const isLoginLoading = useSignal(false)

  const registerArtistName = useSignal('')
  const registerEmail = useSignal('')
  const registerPassword = useSignal('')
  const registerErrorMessage = useSignal('')
  const isRegisterLoading = useSignal(false)

  useReactiveEffect(() => {
    mode.value
    loginErrorMessage.value = ''
    registerErrorMessage.value = ''
  })

  const login = async () => {
    try {
      isLoginLoading.value = true
      const response = await api.login(loginEmail.value, loginPassword.value)
      session.value = response
    }
    catch (error) {
      console.error(error)
      loginErrorMessage.value = (error as any).message ?? String(error)
    }
    finally {
      isLoginLoading.value = false
    }
  }

  const register = async () => {
    try {
      isRegisterLoading.value = true
      const response = await api.register(registerArtistName.value, registerEmail.value, registerPassword.value)
      session.value = response
    }
    catch (error) {
      console.error(error)
      registerErrorMessage.value = (error as any).message ?? String(error)
    }
    finally {
      isRegisterLoading.value = false
    }
  }

  return (
    <div class="flex flex-col gap-11 h-full w-52 py-2.5 text-neutral-400 text-sm select-none">
      {(mode.value === 'login' || mode.value === 'both') && (
        <form
          onSubmit={e => e.preventDefault()}
          class="py-0 flex flex-col items-stretch justify-between gap-2 cursor-pointer"
        >
          {placement === 'bottom' && loginErrorMessage.value && <Error message={loginErrorMessage.value} />}
          <input
            required
            class="w-full bg-white/5 py-1 px-2 outline-none"
            type="email"
            placeholder="Email"
            autocomplete="email"
            value={loginEmail}
            onChange={e => loginEmail.value = (e.target as HTMLInputElement).value}
          />
          <input
            required
            class="w-full bg-white/5 py-1 px-2 outline-none"
            type="password"
            placeholder="Password"
            autocomplete="current-password"
            value={loginPassword}
            onChange={e => loginPassword.value = (e.target as HTMLInputElement).value}
          />
          <div class="flex flex-row items-center justify-between">
            <SidebarButton onClick={login} disabled={isLoginLoading.value}
              class={mode.value === 'both' ? 'w-full' : ''}
            >
              {isLoginLoading.value ? 'Logging in...' : 'Login'} {isLoginLoading.value
                ? <CircleNotchIcon size={16} class="animate-spin" />
                : <SignInIcon size={16} class="group-hover:text-white" />}
            </SidebarButton>

            {mode.value !== 'both' && (
              <div class="text-xs text-center">
                <span class="text-white/30">or</span>{' '}
                <a href="#" class="hover:text-white" onClick={e => {
                  e.preventDefault()
                  mode.value = 'register'
                }}>
                  register
                </a>
              </div>
            )}
          </div>
          {placement === 'top' && loginErrorMessage.value && <Error message={loginErrorMessage.value} />}
        </form>
      )}
      {(mode.value === 'register' || mode.value === 'both') && (
        <form onSubmit={e => e.preventDefault()}
          class="py-0 flex flex-col items-stretch justify-between gap-2 cursor-pointer"
        >
          {placement === 'bottom' && registerErrorMessage.value && <Error message={registerErrorMessage.value} />}
          <input
            required
            class="w-full bg-white/5 py-1 px-2 outline-none"
            type="text"
            placeholder="Artist Name"
            autocomplete="name"
            value={registerArtistName}
            onChange={e => registerArtistName.value = (e.target as HTMLInputElement).value}
          />
          <input
            required
            class="w-full bg-white/5 py-1 px-2 outline-none"
            type="email"
            placeholder="Email"
            autocomplete="email"
            value={registerEmail}
            onChange={e => registerEmail.value = (e.target as HTMLInputElement).value}
          />
          <input
            required
            class="w-full bg-white/5 py-1 px-2 outline-none"
            type="password"
            placeholder="Password"
            autocomplete="new-password"
            value={registerPassword}
            onChange={e => registerPassword.value = (e.target as HTMLInputElement).value}
          />
          <div class="flex flex-row items-center justify-between">
            <SidebarButton onClick={register} disabled={isRegisterLoading.value}
              class={mode.value === 'both' ? 'w-full' : ''}
            >
              {isRegisterLoading.value ? 'Registering...' : 'Register'} {isRegisterLoading.value
                ? <CircleNotchIcon size={16} class="animate-spin" />
                : <PencilSimpleLineIcon size={16} class="group-hover:text-white" />}
            </SidebarButton>

            {mode.value !== 'both' && (
              <div class="text-xs text-center">
                <span class="text-white/30">or</span>{' '}
                <a href="#" class="hover:text-white" onClick={e => {
                  e.preventDefault()
                  mode.value = 'login'
                }}>
                  login
                </a>
              </div>
            )}
          </div>
          {placement === 'top' && registerErrorMessage.value && <Error message={registerErrorMessage.value} />}
        </form>
      )}
    </div>
  )
}
