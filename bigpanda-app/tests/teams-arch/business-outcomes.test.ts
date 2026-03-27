import { describe, it } from 'vitest'
// Subject will be created in Plan 21-01
// import { getTeamsTabData } from '../../lib/queries'

describe('business-outcomes API shape (TEAMS-02)', () => {
  it.todo('getTeamsTabData returns businessOutcomes array with id, title, track, delivery_status, mapping_note')
  it.todo('businessOutcomes.track is one of ADR | Biggy | Both')
  it.todo('businessOutcomes.delivery_status is one of live | in_progress | blocked | planned')
  it.todo('POST /api/projects/[id]/business-outcomes returns created outcome with correct shape')
  it.todo('PATCH /api/projects/[id]/business-outcomes/[id] updates fields and returns updated outcome')
})
