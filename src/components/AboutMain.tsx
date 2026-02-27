import { InfoIcon } from '@phosphor-icons/react'
import { Link } from '../router.tsx'
import { Header } from './Header.tsx'
import { Main } from './Main.tsx'

export const AboutMain = () => {
  return (
    <>
      <Header>
        <InfoIcon size={24} />
        <h2 class="text-white font-semibold">About</h2>
      </Header>
      <Main class="p-4 pl-12 max-w-[42rem]">
        <section class="mb-6">
          <p class="text-white/70 text-sm leading-relaxed">
            loopmaster is a live coding environment for audio. Write code in real time and hear the result instantly.
            Built-in synths, effects, and sequencing run in the browser with no installation.
          </p>
        </section>
        <section class="mb-6">
          <h2 class="text-white font-semibold mb-2 border-b border-white">Contact</h2>
          <ul class="text-sm text-white/70 space-y-1">
            <li>
              <Link to="https://discord.gg/NSWaB9dRYh" target="_blank" class="text-white/90 hover:underline">
                Discord
              </Link>
            </li>
            <li>
              <Link to="https://loopmaster.featurebase.app/" target="_blank" class="text-white/90 hover:underline">
                Feedback
              </Link>
            </li>
            <li>
              <Link to="https://github.com/loopmaster-xyz/loopmaster" target="_blank"
                class="text-white/90 hover:underline"
              >
                GitHub
              </Link>
            </li>
          </ul>
        </section>
        <section>
          <h2 class="text-white font-semibold mb-2 border-b border-white">Legal</h2>
          <h3 id="terms" class="text-white/90 font-medium text-sm mt-3 mb-1">Terms of Service</h3>
          <p class="text-white/70 text-sm leading-relaxed mb-4">
            By using LoopMaster you agree to use the service responsibly. Do not upload content that infringes others’
            rights or violates applicable law. We may modify or discontinue the service at any time.
          </p>
          <h3 id="privacy" class="text-white/90 font-medium text-sm mt-3 mb-1">Privacy Policy</h3>
          <p class="text-white/70 text-sm leading-relaxed">
            We store account data and project content necessary to provide the service. We do not sell your data.
            Session and usage information may be collected for operation and improvement of the service.
          </p>
        </section>
      </Main>
    </>
  )
}
