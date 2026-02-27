import { GridItem } from './GridItem.tsx'
import { Header } from './Header.tsx'
import { helpItems } from './Help.tsx'
import { Main } from './Main.tsx'

export const HelpMain = () => {
  return (
    <>
      <Header />
      <Main class="p-4">
        <div class="grid grid-cols-3 gap-4">
          {helpItems.map(item => (
            <GridItem to={item.url}>
              <item.Icon size={24} />
              <span class="mt-2">{item.name}</span>
            </GridItem>
          ))}
        </div>
      </Main>
    </>
  )
}
