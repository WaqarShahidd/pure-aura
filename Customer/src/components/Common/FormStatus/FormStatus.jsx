import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'

// Forms here have no backend to post to, so a submit records intent and confirms it. Said
// plainly rather than pretending a message was transmitted.
export default function FormStatus({ title, body }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-sage px-6 py-12 text-center">
      <CheckCircleOutlineIcon className="text-olive" />
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="max-w-sm text-sm text-text-muted">{body}</p>
    </div>
  )
}
