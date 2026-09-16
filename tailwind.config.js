/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
  			brand: ['"Titillium Web"', 'sans-serif'],
  			mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			// Theme tokens — see src/index.css. These follow light/dark and the
  			// glass/solid surface style; prefer them over any raw colour.
  			ground: 'rgb(var(--ground-rgb) / <alpha-value>)',
  			// Translucent ground for sticky headers and nav, which must stay
  			// see-through in both surface styles — and which differs per theme
  			// by more than opacity, so it gets its own token.
  			chrome: 'var(--chrome)',
  			elevated: 'var(--elevated)',
  			scrim: 'var(--scrim)',
  			surface: {
  				1: 'var(--surface-1)',
  				2: 'var(--surface-2)',
  				3: 'var(--surface-3)'
  			},
  			edge: {
  				1: 'var(--edge-1)',
  				2: 'var(--edge-2)',
  				3: 'var(--edge-3)'
  			},
  			content: {
  				DEFAULT: 'var(--text-primary)',
  				secondary: 'var(--text-secondary)',
  				tertiary: 'var(--text-tertiary)',
  				muted: 'var(--text-muted)',
  				faint: 'var(--text-faint)'
  			},
  			'on-accent': 'var(--on-accent)',
  			// Cyan for lettering — readable on either ground. Fills keep sosika-cyan.
  			'accent-ink': 'var(--accent-ink)',
  			'amber-ink': 'var(--amber-ink)',
  			'emerald-ink': 'var(--emerald-ink)',

  			// Deprecated: bg-sosika-ground aliases bg-ground until migrated.
  			'sosika-ground': 'rgb(var(--ground-rgb) / <alpha-value>)',
  			'sosika-cyan': 'rgb(var(--sosika-cyan-rgb) / <alpha-value>)',
  			'sosika-amber': 'rgb(var(--sosika-amber-rgb) / <alpha-value>)',
  			'sosika-emerald': 'rgb(var(--sosika-emerald-rgb) / <alpha-value>)',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}

