import {
  Box, Button, Chip, IconButton, Paper, Radio, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'

// The screen the variants decision added.
//
// Options define the axes (Size: 30ml, 50ml); variants are the rows that result. A
// single-variant product shows one row and no option columns, which is the common case -
// most products are one SKU and the editor should not make them feel otherwise.
//
// Exactly one variant is the default. The storefront reads product-level price, stock and
// variantSummary from it, so a product without one would render as priceless; the radio
// makes that a single choice rather than a checkbox anyone can leave unticked.
export default function VariantMatrix({ options, variants, onChange, onOptionsChange }) {
  const axes = options.map((option) => option.name)

  const updateVariant = (index, patch) => {
    onChange(variants.map((variant, at) => (at === index ? { ...variant, ...patch } : variant)))
  }

  const setDefault = (index) => {
    onChange(variants.map((variant, at) => ({ ...variant, isDefault: at === index })))
  }

  const addVariant = () => {
    onChange([
      ...variants,
      {
        label: '',
        sku: '',
        price: 0,
        compareAtPrice: null,
        stockQuantity: 0,
        lowStockThreshold: 5,
        isDefault: variants.length === 0,
        isActive: true,
        optionValues: {},
      },
    ])
  }

  const removeVariant = (index) => {
    const next = variants.filter((_, at) => at !== index)
    // Never leave the product without a default.
    if (next.length > 0 && !next.some((variant) => variant.isDefault)) next[0].isDefault = true
    onChange(next)
  }

  const addOption = () => {
    onOptionsChange([...options, { name: '', values: [] }])
  }

  const updateOption = (index, patch) => {
    onOptionsChange(options.map((option, at) => (at === index ? { ...option, ...patch } : option)))
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
          <Typography variant="h3">Options</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button size="small" startIcon={<AddIcon />} onClick={addOption}>
            Add option
          </Button>
        </Stack>

        <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
          Leave this empty for a product sold as a single SKU.
        </Typography>

        <Stack spacing={1.5}>
          {options.map((option, index) => (
            <Paper key={index} sx={{ p: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'flex-start' }}>
                <TextField
                  label="Option name"
                  placeholder="Size"
                  value={option.name}
                  onChange={(event) => updateOption(index, { name: event.target.value })}
                  sx={{ width: 180 }}
                />
                <TextField
                  label="Values (comma separated)"
                  placeholder="30ml, 50ml, 100ml"
                  value={option.values.join(', ')}
                  onChange={(event) =>
                    updateOption(index, {
                      values: event.target.value
                        .split(',')
                        .map((value) => value.trim())
                        .filter(Boolean),
                    })
                  }
                  fullWidth
                />
                <IconButton
                  onClick={() => onOptionsChange(options.filter((_, at) => at !== index))}
                  aria-label="Remove option"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Box>

      <Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
          <Typography variant="h3">Variants</Typography>
          <Chip size="small" label={`${variants.length}`} />
          <Box sx={{ flexGrow: 1 }} />
          <Button size="small" startIcon={<AddIcon />} onClick={addVariant}>
            Add variant
          </Button>
        </Stack>

        <Paper sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#faf9f5' }}>
                <TableCell width={70}>
                  <Tooltip title="The variant the storefront shows by default">
                    <span>Default</span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ minWidth: 180 }}>Label</TableCell>
                {axes.map((axis) => (
                  <TableCell key={axis} sx={{ minWidth: 120 }}>
                    {axis || 'Option'}
                  </TableCell>
                ))}
                <TableCell sx={{ minWidth: 130 }}>SKU</TableCell>
                <TableCell sx={{ minWidth: 110 }}>Price (Rs)</TableCell>
                <TableCell sx={{ minWidth: 110 }}>Compare at</TableCell>
                <TableCell sx={{ minWidth: 90 }}>Stock</TableCell>
                <TableCell width={50} />
              </TableRow>
            </TableHead>

            <TableBody>
              {variants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7 + axes.length} sx={{ color: 'text.secondary' }}>
                    No variants yet — a product needs at least one.
                  </TableCell>
                </TableRow>
              )}

              {variants.map((variant, index) => (
                <TableRow key={variant.id ?? index} hover>
                  <TableCell>
                    <Radio
                      size="small"
                      checked={Boolean(variant.isDefault)}
                      onChange={() => setDefault(index)}
                      slotProps={{ input: { 'aria-label': `Make variant ${index + 1} the default` } }}
                    />
                  </TableCell>

                  <TableCell>
                    <TextField
                      value={variant.label ?? ''}
                      onChange={(event) => updateVariant(index, { label: event.target.value })}
                      placeholder="Unscented / 30ml"
                      fullWidth
                    />
                  </TableCell>

                  {axes.map((axis) => (
                    <TableCell key={axis}>
                      <TextField
                        select
                        slotProps={{ select: { native: true } }}
                        value={variant.optionValues?.[axis] ?? ''}
                        onChange={(event) =>
                          updateVariant(index, {
                            optionValues: {
                              ...variant.optionValues,
                              [axis]: event.target.value,
                            },
                          })
                        }
                        fullWidth
                      >
                        <option value="">—</option>
                        {(options.find((option) => option.name === axis)?.values ?? []).map(
                          (value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ),
                        )}
                      </TextField>
                    </TableCell>
                  ))}

                  <TableCell>
                    <TextField
                      value={variant.sku ?? ''}
                      onChange={(event) => updateVariant(index, { sku: event.target.value })}
                      fullWidth
                    />
                  </TableCell>

                  <TableCell>
                    <TextField
                      type="number"
                      value={variant.price ?? 0}
                      onChange={(event) =>
                        updateVariant(index, { price: Number(event.target.value) })
                      }
                      slotProps={{ htmlInput: { min: 0, step: 1 } }}
                      fullWidth
                    />
                  </TableCell>

                  <TableCell>
                    <TextField
                      type="number"
                      value={variant.compareAtPrice ?? ''}
                      onChange={(event) =>
                        updateVariant(index, {
                          compareAtPrice:
                            event.target.value === '' ? null : Number(event.target.value),
                        })
                      }
                      slotProps={{ htmlInput: { min: 0, step: 1 } }}
                      fullWidth
                    />
                  </TableCell>

                  <TableCell>
                    <TextField
                      type="number"
                      value={variant.stockQuantity ?? 0}
                      onChange={(event) =>
                        updateVariant(index, { stockQuantity: Number(event.target.value) })
                      }
                      slotProps={{ htmlInput: { min: 0, step: 1 } }}
                      fullWidth
                    />
                  </TableCell>

                  <TableCell>
                    <IconButton
                      onClick={() => removeVariant(index)}
                      disabled={variants.length === 1}
                      aria-label="Remove variant"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1 }}>
          Prices are whole rupees. A variant that has already been ordered is deactivated
          rather than deleted, so order history keeps resolving.
        </Typography>
      </Box>
    </Stack>
  )
}
