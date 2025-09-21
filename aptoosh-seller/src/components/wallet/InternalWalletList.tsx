import React from 'react'
import {Button} from '@/components/ui/button'
import {FileDown, Trash2} from 'lucide-react'
import {truncateString} from '@/lib/cryptoFormat'

interface InternalWalletListProps {
  addresses: string[]
  activeAddress: string | null
  isInternalActive: boolean
  onActivate: (addr: string) => void | Promise<void>
  onCreate?: () => void | Promise<void>
  onExport: (addr: string) => void | Promise<void>
  onDelete: (addr: string) => void | Promise<void>
  compact?: boolean
}

const InternalWalletList: React.FC<InternalWalletListProps> = ({
  addresses,
  activeAddress,
  isInternalActive,
  onActivate,
  onCreate,
  onExport,
  onDelete,
  compact,
}) => {
  if (!addresses?.length) return null

  return (
    <div>
      <ul className="space-y-2">
        {addresses.map((addr) => {
          const isActive = activeAddress === addr
          return (
            <li key={addr} className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isActive && isInternalActive ? 'default' : 'outline'}
                className={`text-[10px] flex-1 justify-start ${compact ? 'h-7' : ''}`}
                onClick={() => onActivate(addr)}
              >
                {truncateString(addr, 22)}
              </Button>
              <Button
                size="icon"
                variant="outline"
                className={`${compact ? 'h-7 w-7' : 'h-8 w-8'}`}
                title="Export mnemonic"
                onClick={() => onExport(addr)}
              >
                <FileDown className="w-4 h-4"/>
              </Button>
              <Button
                size="icon"
                variant="outline"
                className={`${compact ? 'h-7 w-7' : 'h-8 w-8'} text-red-600 hover:text-red-700`}
                title="Delete"
                onClick={() => onDelete(addr)}
              >
                <Trash2 className="w-4 h-4"/>
              </Button>
            </li>
          )
        })}
      </ul>
      {isInternalActive && onCreate && (
        <div className="mt-2 text-right flex justify-end">
          <Button size="sm" variant="outline" onClick={onCreate}>
            Create another
          </Button>
        </div>
      )}
    </div>
  )
}

export default InternalWalletList
