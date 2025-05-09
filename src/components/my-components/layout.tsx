import { useState } from "react"
import { LayoutGrid, List, Columns } from 'lucide-react';


export const LayoutSelector: React.FC = () => {
    const [layout, setLayout] = useState(() => {
        return localStorage.getItem("layout") || "compact";
    });
    return (
        <>
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <button
                    onClick={() => setLayout('grid')}
                    className={`p-1.5 rounded-md ${layout === 'grid' ? 'bg-[#ededed] dark:bg-gray-700 shadow-sm' : ''}`}
                    title="Grid view"
                >
                    <Columns className="h-4 w-4" />
                </button>
                <button
                    onClick={() => setLayout('list')}
                    className={`p-1.5 rounded-md ${layout === 'list' ? 'bg-[#ededed] dark:bg-gray-700 shadow-sm' : ''}`}
                    title="List view"
                >
                    <List className="h-4 w-4" />
                </button>
                <button
                    onClick={() => setLayout('compact')}
                    className={`p-1.5 rounded-md ${layout === 'compact' ? 'bg-[#ededed] dark:bg-gray-700 shadow-sm' : ''}`}
                    title="Compact view"
                >
                    <LayoutGrid className="h-4 w-4" />
                </button>
            </div>
        </>
    )
}