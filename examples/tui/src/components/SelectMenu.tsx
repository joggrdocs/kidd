import { Box, Text, useInput } from 'ink'
import type { ReactElement } from 'react'
import { useCallback, useState } from 'react'
import { match } from 'ts-pattern'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the SelectMenu component.
 */
export interface SelectMenuProps {
  readonly label: string
  readonly options: readonly string[]
  readonly accentColor: string
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * An interactive single-select menu navigated with arrow keys. Press
 * Return to confirm a selection. Demonstrates a component that requires
 * interactive mode in the stories viewer (keyboard input).
 */
export function SelectMenu({ label, options, accentColor }: SelectMenuProps): ReactElement {
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)

  const handleConfirm = useCallback(() => {
    const item = options[highlightIndex]
    if (item !== undefined) {
      setSelected(item)
    }
  }, [options, highlightIndex])

  useInput((_input, key) => {
    if (key.upArrow) {
      setHighlightIndex((i) =>
        match(i <= 0)
          .with(true, () => options.length - 1)
          .with(false, () => i - 1)
          .exhaustive()
      )
    }
    if (key.downArrow) {
      setHighlightIndex((i) =>
        match(i >= options.length - 1)
          .with(true, () => 0)
          .with(false, () => i + 1)
          .exhaustive()
      )
    }
    if (key.return) {
      handleConfirm()
    }
  })

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color={accentColor}>
          {label}
        </Text>
      </Box>
      {options.map((option, index) => (
        <OptionRow
          key={option}
          option={option}
          isHighlighted={index === highlightIndex}
          isSelected={option === selected}
          accentColor={accentColor}
        />
      ))}
      {selected !== null && (
        <Box marginTop={1}>
          <Text dimColor>
            Selected: <Text color={accentColor}>{selected}</Text>
          </Text>
        </Box>
      )}
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * A single option row with highlight and selection indicators.
 *
 * @private
 */
function OptionRow({
  option,
  isHighlighted,
  isSelected,
  accentColor,
}: {
  readonly option: string
  readonly isHighlighted: boolean
  readonly isSelected: boolean
  readonly accentColor: string
}): ReactElement {
  const indicator = match({ isHighlighted, isSelected })
    .with({ isSelected: true }, () => ({ symbol: '●', color: accentColor }))
    .with({ isHighlighted: true }, () => ({ symbol: '›', color: accentColor }))
    .otherwise(() => ({ symbol: ' ', color: 'gray' }))

  return (
    <Box>
      <Text color={indicator.color}>{indicator.symbol} </Text>
      <Text bold={isHighlighted} color={isHighlighted ? accentColor : undefined}>
        {option}
      </Text>
    </Box>
  )
}
