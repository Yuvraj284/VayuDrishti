import CycloneCanvas from './CycloneVisualization'

interface CycloneSceneProps {
  className?: string
}

/**
 * Thin wrapper — renders the 2D canvas cyclone.
 * Kept as a separate component so the API stays stable.
 */
export default function CycloneScene({ className }: CycloneSceneProps) {
  return <CycloneCanvas className={className} />
}
