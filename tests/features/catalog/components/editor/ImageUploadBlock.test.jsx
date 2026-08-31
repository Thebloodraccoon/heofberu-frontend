import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ImageUploadBlock from '@/features/catalog/components/editor/ImageUploadBlock.jsx'

function fileOf(type, size = 1024) {
  return new File([new ArrayBuffer(size)], 'img.png', { type })
}

describe('ImageUploadBlock', () => {
  it('shows the default placeholder image when no image_url is set', () => {
    render(<ImageUploadBlock imageUrl={null} onUpload={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByAltText('Изображение записи')).toHaveAttribute(
      'src',
      '/default-img-verney.jpg',
    )
    expect(screen.getByRole('button', { name: 'Загрузить' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Удалить' })).not.toBeInTheDocument()
  })

  it('shows the uploaded image and a remove button once an image_url exists', () => {
    render(
      <ImageUploadBlock
        imageUrl="https://cdn.example.com/races/1.png"
        onUpload={vi.fn()}
        onRemove={vi.fn()}
      />,
    )
    expect(screen.getByAltText('Изображение записи')).toHaveAttribute(
      'src',
      'https://cdn.example.com/races/1.png',
    )
    expect(screen.getByRole('button', { name: 'Заменить' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Удалить' })).toBeInTheDocument()
  })

  it('uploads a valid file through the hidden input', async () => {
    const user = userEvent.setup()
    const onUpload = vi.fn().mockResolvedValue(undefined)
    render(<ImageUploadBlock imageUrl={null} onUpload={onUpload} onRemove={vi.fn()} />)

    const input = screen.getByTestId('catalog-image-input')
    await user.upload(input, fileOf('image/png'))

    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1))
    expect(onUpload).toHaveBeenCalledWith(expect.any(File))
  })

  it('rejects an unsupported file type without calling onUpload', async () => {
    const onUpload = vi.fn()
    render(<ImageUploadBlock imageUrl={null} onUpload={onUpload} onRemove={vi.fn()} />)

    const input = screen.getByTestId('catalog-image-input')
    fireEvent.change(input, { target: { files: [fileOf('text/plain')] } })

    expect(onUpload).not.toHaveBeenCalled()
    expect(screen.getByText(/Поддерживаются только JPEG, PNG, WebP или GIF/i)).toBeInTheDocument()
  })

  it('calls onRemove when the user confirms deletion', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn().mockResolvedValue(undefined)
    render(
      <ImageUploadBlock imageUrl="https://cdn.example.com/1.png" onUpload={vi.fn()} onRemove={onRemove} />,
    )
    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })
})
