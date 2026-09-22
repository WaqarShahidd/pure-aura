import { useRef, useState } from 'react'
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined'
import CloseIcon from '@mui/icons-material/Close'
import { productPageCopy, MAX_UPLOAD_BYTES } from '../../../config/productPage'
import { cn } from '../../../utils/classNames'

// There is no upload target yet, so the file never leaves the browser — this records the
// selection and validates the size so the flow is real from the customer's side.
export default function FileDropzone({ file, onChange }) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)
  const { upload } = productPageCopy

  const accept = (candidate) => {
    if (!candidate) return
    if (candidate.size > MAX_UPLOAD_BYTES) {
      setError(upload.error)
      onChange(null)
      return
    }
    setError(null)
    onChange(candidate)
  }

  return (
    <div>
      <p className="mb-2 text-sm">{upload.heading}</p>

      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          accept(event.dataTransfer.files?.[0])
        }}
        className={cn(
          'flex flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-8 text-center transition-colors',
          dragging ? 'border-charcoal bg-sage/50' : 'border-charcoal/25',
        )}
      >
        <FileUploadOutlinedIcon className="text-text-muted" />

        {file ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="max-w-56 truncate">{file.name}</span>
            <button
              type="button"
              aria-label="Remove file"
              onClick={() => {
                onChange(null)
                if (inputRef.current) inputRef.current.value = ''
              }}
              className="text-text-muted transition-colors hover:text-charcoal"
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </button>
          </div>
        ) : (
          <p className="text-sm text-text-muted">
            {upload.prompt}{' '}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-charcoal underline underline-offset-4"
            >
              {upload.browse}
            </button>
          </p>
        )}

        <p className="text-xs text-text-muted">{upload.hint}</p>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(event) => accept(event.target.files?.[0])}
        />
      </div>

      {error && <p className="mt-2 text-xs text-accent">{error}</p>}
    </div>
  )
}
