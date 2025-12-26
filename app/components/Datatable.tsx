import DataTable, { TableColumn } from 'react-data-table-component';

type DatatableProps<T> = {
  columns: TableColumn<T>[];
  rowData: T[];
  customStyles?: any;
  progressPending?: boolean;
  pagination?: boolean;
};
const defaultCustomStyles = {
  rows: {
    style: {
      fontSize: '13px',
      color: '#000000',
    },
  },
  table: {
    style: {
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      overflow: 'hidden',
    },
  },
  headCells: {
    style: {
      fontSize: '13px',
      fontWeight: 700,
      color: '#000000',
      borderBottomStyle: 'none',
      overflowWrap: 'break-word',    // 🔑 correct property
      wordBreak: 'break-all',
    },
  }
};
export default function Datatable<T>({
  columns,
  rowData,
  customStyles,
  progressPending,
  pagination
}: DatatableProps<T>) {
  return (
    <DataTable
      columns={columns}
      data={rowData}
      customStyles={customStyles ?? defaultCustomStyles}
      striped
      noDataComponent={<div className="mx-auto w-50">No data found</div>}
      progressPending={progressPending}
      pagination={pagination}
    />
  );
}
