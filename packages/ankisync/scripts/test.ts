import { pp } from '@patarapolw/prettyprint'

import { Apkg } from '../src'

;(async () => {
  const apkg = await Apkg.connect('/Users/patarapolw/Dropbox/Public/10k WK Breakdown__7 - お負け Bonus.apkg')

  pp(await apkg.anki2.find())

  // await apkg.cleanup()
})().catch(console.error)
