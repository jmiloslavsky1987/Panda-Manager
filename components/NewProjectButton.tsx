'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import { ProjectWizard } from './ProjectWizard'

export function NewProjectButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="default">New Project</Button>
      <ProjectWizard open={open} onOpenChange={setOpen} />
    </>
  )
}
