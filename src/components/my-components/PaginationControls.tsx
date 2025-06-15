import React from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationLink,
  PaginationNext,
  PaginationEllipsis
} from '../ui/pagination';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({ currentPage, totalPages, onPageChange, className }) => {
  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={e => {
              e.preventDefault();
              onPageChange(currentPage - 1);
            }}
          />
        </PaginationItem>
        {[...Array(totalPages)].map((_, i) => {
          const pageNum = i + 1;
          return (
            <PaginationItem key={pageNum}>
              <PaginationLink
                href="#"
                isActive={currentPage === pageNum}
                onClick={e => {
                  e.preventDefault();
                  onPageChange(pageNum);
                }}
              >
                {pageNum}
              </PaginationLink>
            </PaginationItem>
          );
        })}
        {totalPages > 5 && <PaginationEllipsis />}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={e => {
              e.preventDefault();
              onPageChange(currentPage + 1);
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

export default PaginationControls;
