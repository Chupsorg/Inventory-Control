import * as XLSX from "xlsx";

/** Column definition (type-safe) */
export type ExcelColumn<T> = {
  header: string;
  key: keyof T;
  width?: number; // optional column width
};

/** Single sheet config */
export type ExcelSheet<T> = {
  sheetName: string;
  data: T[];
  columns: readonly ExcelColumn<T>[];
};

/** Input can be single sheet or multiple sheets */
export type ExportInput<T> = ExcelSheet<T> | ExcelSheet<T>[];

/** Export function */
export function exportToExcel<T extends Record<string, any>>(
  input: ExportInput<T>,
  fileName: string
) {
  const workbook = XLSX.utils.book_new();
  const sheets = Array.isArray(input) ? input : [input];

  sheets.forEach(({ sheetName, data, columns }) => {
    const formattedData = data.map((row) => {
      const obj: Record<string, any> = {};
      columns.forEach((col) => {
        obj[col.header] = row[col.key];
      });
      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedData);

    // Auto / custom column width
    worksheet["!cols"] = columns.map((col) => ({
      wch: col.width ?? 20,
    }));

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}
