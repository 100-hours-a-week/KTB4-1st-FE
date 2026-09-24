export type ItemRegisterFormValues = {
  title: string
  content: string
  itemState: 'AVAILABLE' | 'COMPLETED'
  quantity: number | undefined
  groupIds: number[]
  pace: number
  condition: number
}

export type SelectedImage = {
  id: string
  file: File
  preview: string
}
