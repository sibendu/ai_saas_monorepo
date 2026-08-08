const { execFileSync } = require('child_process')
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require('fs')
const { join } = require('path')
const { tmpdir } = require('os')

const fixtureClasses = [
  'bg-primary',
  'bg-primary/80',
  'text-danger/90',
  'border-border',
  'ring-focus',
  'ring-theme',
  'font-body',
  'text-body',
  'p-theme-md',
  'rounded-theme',
  'shadow-theme-md',
]

const expectedOutput = [
  [
    'bg-primary',
    '--tw-bg-opacity: 1',
    'background-color: rgb(var(--color-primary) / var(--tw-bg-opacity',
  ],
  ['bg-primary/80', 'background-color: rgb(var(--color-primary) / 0.8'],
  ['text-danger/90', 'color: rgb(var(--color-danger) / 0.9'],
  [
    'border-border',
    'border-color: rgb(var(--color-border) / var(--tw-border-opacity',
  ],
  [
    'ring-focus',
    '--tw-ring-color: rgb(var(--color-focus-ring) / var(--tw-ring-opacity',
  ],
  ['ring-theme', '--tw-ring-offset-shadow'],
  ['font-body', 'font-family: var(--font-family-body)'],
  ['text-body', 'font-size: var(--font-size-base)'],
  ['p-theme-md', 'padding: var(--spacing-md)'],
  ['rounded-theme', 'border-radius: var(--border-radius)'],
  ['shadow-theme-md', '--tw-shadow: var(--shadow-md)'],
]

const tempDir = mkdtempSync(join(tmpdir(), 'tailwind-theme-'))
const inputPath = join(tempDir, 'input.css')
const contentPath = join(tempDir, 'content.html')
const outputPath = join(tempDir, 'output.css')
const appRoot = join(__dirname, '..')
const tailwindCliPath = require.resolve('tailwindcss/lib/cli.js', { paths: [appRoot] })

writeFileSync(inputPath, '@tailwind utilities;\n')
writeFileSync(contentPath, `<div class="${fixtureClasses.join(' ')}"></div>\n`)

try {
  execFileSync(
    process.execPath,
    [
      tailwindCliPath,
      '-c',
      'tailwind.config.js',
      '-i',
      inputPath,
      '--content',
      contentPath,
      '-o',
      outputPath,
    ],
    {
      cwd: appRoot,
      stdio: 'pipe',
    },
  )

  const generatedCss = readFileSync(outputPath, 'utf8')
  const missing = expectedOutput.filter(([, ...snippets]) =>
    snippets.some((snippet) => !generatedCss.includes(snippet)),
  )

  if (missing.length > 0) {
    throw new Error(
      `Tailwind theme verification failed. Missing generated output for: ${missing
        .map(([utility]) => utility)
        .join(', ')}`,
    )
  }

  console.log(`Tailwind semantic theme utilities generated: ${fixtureClasses.join(', ')}`)
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}
