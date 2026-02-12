"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { useCallApiMutation } from "@/app/store/services/apiSlice";
import { useRouter } from "next/navigation";
import {
  Container,
  Row,
  Col,
  Button,
  Form,
  Modal,
  InputGroup,
  Tabs,
  Tab,
} from "react-bootstrap";
import Image from "next/image";
import { TableColumn } from "react-data-table-component";
import Datatable from "@/app/components/Datatable";
import { getDayName, formatDate } from "@/app/utils/properties";
import {
  toggleItem,
  updateItemQty,
  setPrimaryItems,
  bulkUpdateRcomQty,
  selectSpecificItems,
  applyMathToSelected,
  addItemToGroup,
  setAvailableItems,
  markSelectedAsTouched,
} from "@/app/store/features/primaryItemsSlice";
import { exportToExcel } from "@/app/utils/exportToExcel";
import { getConfigSignature } from "@/app/utils/reducerSignature";

type OrderRow = {
  id: number;
  momName: string;
  itemCode: number;
  itemName: string;
  mainItemCode: number;
  mainItemName: string;
  vegType: "Veg" | "Non-Veg";
  platform: string;
  itemQty: number;
  rcomQty: number;
  UOM: string;
  itemMeasQty: string;
  itemMeasDesc: string;
  itemMeasCode: number;
  groupIndex: number;
  checked: boolean;
  qty: number;
  uom: string;
  availableStock: number;
  touched: boolean;
};

type PrimaryItemExcelRow = {
  id: number;
  momName: string;
  itemName: string;
  itemCode: number;
  mainItemName: string;
  vegType: string;
  platform: string;
  itemQty: number;
  rcomQty: number | "";
  uom: string;
};

const COMMON_EXCEL_COLUMNS = [
  { header: "#", key: "id" },
  { header: "Mom", key: "momName" },
  { header: "Item Name", key: "itemName" },
  { header: "Item Code", key: "itemCode" },
  { header: "UOM", key: "uom" },
  { header: "Previous Orders", key: "itemQty" },
  { header: "Recommended Orders", key: "rcomQty" },
  { header: "Veg Type", key: "vegType" },
] as const;


const PrimaryItemGroup = ({
  groupIndex,
  con,
  dispatch,
  isLoading,
  onAddClick,
}: {
  groupIndex: number;
  con: any;
  dispatch: any;
  isLoading: boolean;
  onAddClick: () => void;
}) => {
  const items = Array.isArray(con.items) ? con.items : [];
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [qtyOperator, setQtyOperator] = useState<
    "<" | ">" | "<=" | ">=" | "=" | ""
  >("");
  const [qtyValue, setQtyValue] = useState<number | "">("");
  const [isQtyFilterApplied, setIsQtyFilterApplied] = useState(false);

  // Local state for the "Quick Bulk Action" on this specific table
  const [localOperator, setLocalOperator] = useState<"+" | "-">("+");
  const [bulkValue, setBulkValue] = useState<number | "">("");
  const [bulkMode, setBulkMode] = useState<"PERCENT" | "VALUE">("VALUE");

  const suggestions = useMemo(() => {
    if (!searchInput) return [];

    const lower = searchInput.toLowerCase();
    const set = new Set<string>();

    items.forEach((item: any) => {
      if (item.itemName?.toLowerCase().includes(lower)) {
        set.add(item.itemName);
      }
      if (item.momName?.toLowerCase().includes(lower)) {
        set.add(item.momName);
      }
      if (item.platform?.toLowerCase().includes(lower)) {
        set.add(item.platform);
      }
      if (item.mainItemName?.toLowerCase().includes(lower)) {
        set.add(item.mainItemName);
      }
      if (item.vegType?.toLowerCase().includes(lower)) {
        set.add(item.vegType);
      }
    });

    return Array.from(set).slice(0, 8);
  }, [searchInput, items]);

  // 1. Filter items based on search term
  const filteredItems = useMemo(() => {
    let result = items;

    if (appliedSearch) {
      const lower = appliedSearch.toLowerCase();

      result = result.filter((item: any) => {
        if (item.vegType && item.vegType.toLowerCase() === lower) {
          return true;
        }
        return (
          item.itemName?.toLowerCase().includes(lower) ||
          item.momName?.toLowerCase().includes(lower) ||
          item.platform?.toLowerCase().includes(lower) ||
          item.mainItemName?.toLowerCase().includes(lower)
        );
      });
    }

    if (isQtyFilterApplied && qtyOperator && qtyValue !== "") {
      result = result.filter((item: any) => {
        const qty = item.itemQty;
        switch (qtyOperator) {
          case "<":
            return qty < qtyValue;
          case ">":
            return qty > qtyValue;
          case "<=":
            return qty <= qtyValue;
          case ">=":
            return qty >= qtyValue;
          case "=":
            return qty == qtyValue;
          default:
            return true;
        }
      });
    }

    return result;
  }, [items, appliedSearch, isQtyFilterApplied, qtyOperator, qtyValue]);

  const isAllVisibleSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item: any) => item.checked);

  const handleSelectAllVisible = (checked: boolean) => {
    const visibleIds = filteredItems.map((item: any) => item.id);
    dispatch(
      selectSpecificItems({
        groupIndex,
        itemIds: visibleIds,
        checked,
      })
    );
  };

  const handleLocalBulkUpdate = () => {
    if (bulkValue === "") return;
    dispatch(
      applyMathToSelected({
        groupIndex,
        operator: localOperator,
        value: Number(bulkValue),
        mode: bulkMode,
        direct:true
      })
    );
    setBulkValue("");
  };

  const handleDownloadExcel = useCallback(() => {
    if (!items.length) return;

    const exceldata: PrimaryItemExcelRow[] = items.map((item: any) => ({
      id: item.id,
      momName: item.momName || "-",
      itemName: item.itemName,
      itemCode: item.itemCode,
      mainItemName: item.mainItemName || "-",
      vegType: item.vegType,
      platform: item.platform || "-",
      itemQty: item.itemQty,
      rcomQty: item.rcomQty ?? "",
      uom: `${item.itemMeasQty} ${item.itemMeasDesc}`,
    }));

    exportToExcel(
      [
        {
          sheetName: getDayName(new Date(con.config.date)),
          data: exceldata,
          columns: [
            { header: "#", key: "id" },
            { header: "Mom", key: "momName" },
            { header: "Item Name", key: "itemName" },
            { header: "Item Code", key: "itemCode" },
            { header: "Event / Bundle", key: "mainItemName" },
            { header: "Food Type", key: "vegType" },
            { header: "Platform", key: "platform" },
            { header: "Previous Orders", key: "itemQty" },
            { header: "Recommended Orders", key: "rcomQty" },
            { header: "UOM", key: "uom" },
          ],
        },
      ],
      `Primary_Items_${getDayName(new Date(con.config.date))}`
    );
  }, [items, con.config.date]);


  const columns: TableColumn<OrderRow>[] = useMemo(
    () => [
      {
        name: (
          <Form.Check
            type="checkbox"
            className="rb-orange-check"
            checked={isAllVisibleSelected}
            onChange={(e) => handleSelectAllVisible(e.target.checked)}
          />
        ),
        selector: (row) => row.checked,
        width: "60px",
        cell: (row) => (
          <Form.Check
            type="checkbox"
            className="rb-orange-check"
            checked={row.checked}
            onChange={() =>
              dispatch(toggleItem({ groupIndex, itemId: row.id }))
            }
          />
        ),
      },
      {
        name: "#",
        selector: (row) => row.id,
        width: "60px",
        sortable: true,
        cell: (row) => (
          <span
            className={`${row.itemQty < row.rcomQty
              ? "text-green"
              : row.itemQty > row.rcomQty
                ? "text-secondary"
                : ""
              }`}
          >
            {row.id}
          </span>
        ),
      },
      {
        name: "Mom",
        selector: (row) => row.momName,
        width: "130px",
        sortable: true,
        cell: (row) => (
          <span
            className={`${row.itemQty < row.rcomQty
              ? "text-green"
              : row.itemQty > row.rcomQty
                ? "text-secondary"
                : ""
              }`}
          >
            {row.momName}
          </span>
        ),
      },
      {
        name: "Event/Bundle",
        selector: (row) => row.mainItemName,
        sortable: true,
        width: "250px",
        center: true,
        cell: (row) => (
          <span
            className={`${row.itemQty < row.rcomQty
              ? "text-green"
              : row.itemQty > row.rcomQty
                ? "text-secondary"
                : ""
              }`}
          >
            {row.platform == "Event" || row.itemCode !== row.mainItemCode
              ? row.mainItemName
              : "-"}
          </span>
        ),
      },
      {
        name: "Item",
        selector: (row) => row.itemName,
        width: "250px",
        sortable: true,
        cell: (row) => (
          <span
            className={`${row.itemQty < row.rcomQty
              ? "text-green"
              : row.itemQty > row.rcomQty
                ? "text-secondary"
                : ""
              }`}
          >
            {row.itemName}
          </span>
        ),
      },
      {
        name: "UOM",
        width: "100px",
        center: true,
        cell: (row) => (
          <span
            className={`${row.itemQty < row.rcomQty
              ? "text-green"
              : row.itemQty > row.rcomQty
                ? "text-secondary"
                : ""
              }`}
          >
            {`${row?.itemMeasQty}${row?.itemMeasDesc}`}
          </span>
        ),
      },
      {
        name: "Previous Orders",
        selector: (row) => row.itemQty,
        sortable: true,
        center: true,
        cell: (row) => (
          <span
            className={`${row.itemQty < row.rcomQty
              ? "text-green"
              : row.itemQty > row.rcomQty
                ? "text-secondary"
                : ""
              }`}
          >
            {row.itemQty}
          </span>
        ),
      },
      {
        name: "Recommended Orders",
        selector: (row) => row.rcomQty,
        sortable: true,
        center: true,
        cell: (row) => (
          <Form.Control
            type="number"
            className={`text-center ${row.itemQty < row.rcomQty
              ? "green-border"
              : row.itemQty > row.rcomQty
                ? "red-border"
                : ""
              }`}
            value={row.rcomQty}
            onChange={(e) =>
              dispatch(
                updateItemQty({
                  groupIndex,
                  itemId: row.id,
                  qty: e.target.value === "" ? "" : Number(e.target.value),
                  direct: true
                })
              )
            }
          />
        ),
      },
      {
        name: "Food Type",
        selector: (row) => row.vegType,
        sortable: true,
        center: true,
        cell: (row) => (
          <span
            className={`${row.itemQty < row.rcomQty
              ? "text-green"
              : row.itemQty > row.rcomQty
                ? "text-secondary"
                : ""
              }`}
          >
            {row.vegType}
          </span>
        ),
      },
      {
        name: "Platform",
        selector: (row) => row.platform,
        sortable: true,
        center: true,
        cell: (row) => (
          <span
            className={`${row.itemQty < row.rcomQty
              ? "text-green"
              : row.itemQty > row.rcomQty
                ? "text-secondary"
                : ""
              }`}
          >
            {row.platform ? row.platform : "-"}
          </span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groupIndex, filteredItems, isAllVisibleSelected, dispatch]
  );

  const orderRows: OrderRow[] = filteredItems.map((item: any) => ({
    id: item.id,
    momName: item.momName,
    itemName: item.itemName,
    itemCode: item.itemCode,
    mainItemCode: item.mainItemCode,
    platform: item.platform,
    mainItemName: item.mainItemName,
    vegType: item.vegType,
    itemQty: item.itemQty,
    rcomQty: item.rcomQty,
    UOM: item.UOM,
    itemMeasQty: item.itemMeasQty,
    itemMeasDesc: item.itemMeasDesc,
    itemMeasCode:item.itemMeasCode,
    groupIndex,
    checked: item.checked ?? false,
  }));

  const checkedCount = con.items && con.items.filter((i: any) => i.checked).length;
  useEffect(() => {
    const handleClickOutside = () => setShowSuggestions(false);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);
  useEffect(() => {
    if (!searchInput) {
      setAppliedSearch("");
    }
  }, [searchInput]);
  return (
    <Col xs={12} md={12}>
      <div className="d-flex flex-column my-3 p-3 border rounded bg-light">
        {/* Header Section */}
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h4 className="font-16 text-secondary fw-bold m-0">
              {getDayName(new Date(con.config.date as string))} Delivery (
              {filteredItems.length}/{items.length})
            </h4>
            <p className="m-0 font-13">
              {formatDate(con.config.date as string)}
            </p>
          </div>
          <div className="d-flex align-items-stretch">
            <div className="d-flex align-items-stretch me-2 gap-2">
              <Form.Select
                // size="sm"
                // className="h-auto"
                // style={{ width: "80px" }}
                value={qtyOperator}
                onChange={(e) => {
                  setQtyOperator(
                    e.target.value as "<" | ">" | "<=" | ">=" | "="
                  );
                  setIsQtyFilterApplied(false);
                }}
              >
                <option value="" disabled>{`Select`}</option>
                <option value="<">&lt;</option>
                <option value="<=">&lt;=</option>
                <option value=">">&gt;</option>
                <option value=">=">&gt;=</option>
                <option value="=">=</option>
              </Form.Select>

              <Form.Control
                type="number"
                // size="sm"
                placeholder="0"
                style={{ width: "140px" }}
                value={qtyValue}
                onChange={(e) => {
                  setQtyValue(Number(e.target.value));
                  setIsQtyFilterApplied(false);
                }}
              />

              {!isQtyFilterApplied ? (
                <Button
                  // size="sm"
                  className="btn-outline font-12 text-primary fw-bold"
                  disabled={!qtyOperator || qtyValue === ""}
                  onClick={() => setIsQtyFilterApplied(true)}
                >
                  Apply
                </Button>
              ) : (
                <span
                  className="text-primary fw-bold cursor-pointer text-decoration-underline"
                  onClick={() => {
                    setQtyOperator("");
                    setQtyValue("");
                    setIsQtyFilterApplied(false);
                  }}
                >
                  Clear
                </span>
              )}
            </div>
            <div className="d-flex align-items-stretch">
              <Button
                className="btn-outline text-capitalize mb-1 mb-md-0 fw-bold h-100"
                onClick={handleDownloadExcel}
              >
                Download as excel
              </Button>
            </div>
          </div>
        </div>

        {/* Search and Bulk Actions Row */}
        <Row className="g-2 align-items-center">
          {/* Search Bar + ADD BUTTON */}
          <Col xs={12} md={checkedCount > 0 ? 8 : 12}>
            <InputGroup>

              <div className="position-relative flex-grow-1">
                <Form.Control
                  type="search"
                  placeholder="Search items, platform, event, food type..."
                  className="border-end-0 rounded-end-0 ps-2"
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                />

                {showSuggestions && suggestions.length > 0 && (
                  <div className="position-absolute bg-white border rounded w-100 mt-1 z-3">
                    {suggestions.map((sug, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 cursor-pointer hover-bg"
                        onClick={() => {
                          setAppliedSearch(sug);
                          setSearchInput(sug);
                          setShowSuggestions(false);
                        }}
                      >
                        {sug}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <InputGroup.Text className="bg-white border-start-0 rounded-end-1">
                <Image
                  src={"/inventorymanagement/search_black.svg"}
                  height={16}
                  width={16}
                  alt="search"
                />
              </InputGroup.Text>
              <div
                className="border rounded-2 ms-2 px-2 py-1 bg-white cursor-pointer"
                onClick={onAddClick}
              >
                <Image
                  src={"/inventorymanagement/orange-plus.png"}
                  height={18}
                  width={18}
                  alt="plus"
                />
              </div>
            </InputGroup>
          </Col>

          {/* Inline Bulk Update Controls (Visible only when items are selected) */}
          {checkedCount > 0 && (
            <Col xs={12} md={4}>
              <div className="d-flex align-items-stretch bg-white border rounded p-1">
                <div className="d-flex align-items-center">
                  <span className="font-12 fw-bold text-nowrap px-2">
                    Selected ({checkedCount}):
                  </span>

                  {/* Operator Selector */}
                  <Form.Select
                    size="sm"
                    style={{ width: "60px" }}
                    value={localOperator}
                    onChange={(e: any) => setLocalOperator(e.target.value)}
                    className="me-1 border-0 bg-light"
                  >
                    <option value="+">+</option>
                    <option value="-">-</option>
                  </Form.Select>

                  {/* Input with Qty/% Toggle */}
                  <InputGroup
                    size="sm"
                    className="me-1"
                    style={{ maxWidth: "150px" }}
                  >
                    <Form.Control
                      type="number"
                      placeholder="0"
                      value={bulkValue}
                      onChange={(e) => setBulkValue(Number(e.target.value))}
                    />
                    <Form.Select
                      style={{ width: "60px", backgroundColor: "#f8f9fa" }}
                      value={bulkMode}
                      onChange={(e: any) => setBulkMode(e.target.value)}
                    >
                      <option value="VALUE">Qty</option>
                      <option value="PERCENT">%</option>
                    </Form.Select>
                  </InputGroup>
                </div>
                <div className="d-flex align-items-stretch">
                  <Button
                    className="btn-filled py-0 font-12"
                    onClick={handleLocalBulkUpdate}
                    disabled={bulkValue === ""}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </Col>
          )}
        </Row>
      </div>

      <Datatable<OrderRow>
        columns={columns}
        rowData={orderRows}
        progressPending={isLoading}
        pagination={true}
      />
    </Col>
  );
};

// --- Main Page Component ---
export default function Page() {
  const [callApi, { isLoading }] = useCallApiMutation();
  const router = useRouter();
  const dispatch = useDispatch();

  const config = useSelector((state: RootState) => state.config.config);
  const loginDetails = useSelector(
    (state: RootState) => state.auth.login_Details
  );

  const {
    list: primaryItemList,
    isFetched,
    lastConfigSignature,
    // availableItems,
  } = useSelector((state: RootState) => state.primaryItems);

  const currentConfigSignature = useMemo(
    () => getConfigSignature(config),
    [config]
  );

  const [filterModal, setfilterModal] = useState(false);
  const [filterType, setFilterType] = useState<"online" | "event">("event");
  const [operator, setOperator] = useState<"+" | "-">("+");
  const [percentage, setPercentage] = useState<number>(0);

  // State to manage the Active Tab
  const [key, setKey] = useState<string | number>(0);
  const [newItemModal, setnewItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [itemSearchText, setItemSearchText] = useState("");
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [stockDataId, setstockDataId] = useState<number | null>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showAllItem, setshowAllItem] = useState(false);
  const [availableItems, setavailableItems] = useState<any>([]);
  const [modalSearchInput, setModalSearchInput] = useState("");
  const [modalAppliedSearch, setModalAppliedSearch] = useState("");
  const [showModalSuggestions, setShowModalSuggestions] = useState(false);
  const [filterWithStock, setFilterWithStock] = useState(true);
  const [filterWithoutStock, setFilterWithoutStock] = useState(true);
  const [modalOperator, setModalOperator] = useState<"+" | "-">("+");
  const [modalBulkQty, setModalBulkQty] = useState<number | "">("");
  const [modalBulkMode, setModalBulkMode] = useState<"VALUE" | "PERCENT">("VALUE");
  const [modalItems, setModalItems] = useState<OrderRow[]>([]);
  const [untouchedModal, setuntouchedModal] = useState(false);
  const [untouchSearchInput, setuntouchSearchInput] = useState("");
  const [untouchAppliedSearch, setuntouchAppliedSearch] = useState("");
  const [showuntouchSuggestions, setShowuntouchSuggestions] = useState(false);
  const [untouchOperator, setuntouchOperator] = useState<"+" | "-">("+");
  const [untouchBulkQty, setuntouchBulkQty] = useState<number | "">("");
  const [untouchBulkMode, setuntouchBulkMode] = useState<"VALUE" | "PERCENT">("VALUE");

  const normalizeDate = (d: any) => {
    if (!d) return null;

    // react-multi-date-picker DateObject
    if (typeof d.toDate === "function") {
      return d.toDate();
    }

    // ISO string or Date
    return new Date(d);
  };
  const buildPrimaryItemPayload = (cfg: any) => {
    const hasRange = Array.isArray(cfg.date_range) && cfg.date_range.length === 2;

    const start = hasRange ? normalizeDate(cfg.date_range[0]) : null;
    const end = hasRange ? normalizeDate(cfg.date_range[1]) : null;
    console.log(cfg)
    return {
      cloud_kitchen_id: loginDetails?.cloudKitchenId,
      delivery_date: new Date(cfg.date).toISOString().split("T")[0],
      sale_days: cfg.days,
      previous_week_count: 1,
      // sale_dates: cfg.custom_date_range,
      sale_dates: [],
      start_date: hasRange
        ? start ? start.toISOString().split("T")[0] : null
        : null,

      end_date: hasRange
        ? end ? end.toISOString().split("T")[0] : null
        : null,
    };
  };

  useEffect(() => {
    if (!loginDetails || !config?.length) return;

    const fetchAll = async () => {
      try {
        // const isConfigChanged = lastConfigSignature && lastConfigSignature !== currentConfigSignature;

        const orderRes = await callApi({
          url: `StoreCtl/get-inventory-data/ORDER/${loginDetails.cloudKitchenId}`,
        }).unwrap();
        if (orderRes?.status && Array.isArray(orderRes.object) && orderRes.object.length > 0) {
          // const configChangedByUser = sessionStorage.getItem("CONFIG_CHANGED") === "true";
          // if (!configChangedByUser) {
          const serverData = orderRes.object[0]?.dataValue;

          if (Array.isArray(serverData)) {
            setstockDataId((orderRes.object as any)?.[0]?.dataId);
            const normalizedData = serverData.map((group: any) => ({
              ...group,
              items: Array.isArray(group.items)
                ? group.items.map((item: any, idx: number) => ({
                  ...item,
                  id: idx + 1,
                  checked: false,
                  touched: item.rcomQty !== item.itemQty,
                }))
                : [],
            }));
            dispatch(
              setPrimaryItems({
                data: normalizedData,
                configSignature: currentConfigSignature,
              })
            );
          }
          // } else {
          // resetPrimaryItem(primaryItemList,(orderRes.object as any)?.[0]?.dataId)
          //   handelGetPrimaryItems()
          // }
        } else {
          handelGetPrimaryItems()
        }
        // sessionStorage.removeItem("CONFIG_CHANGED");
        // if (!availableItems || availableItems.length === 0) {
        const res = await callApi({
          url: `StoreCtl/get-kitchen-primary-items-list/${loginDetails.cloudKitchenId}`,
        }).unwrap();

        if (res?.status) {
          setavailableItems(res.object || []);
        }
        // }
      } catch (err) {
        console.error("Primary items fetch failed:", err);
      }
    };

    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginDetails, config, currentConfigSignature]);

  const handelGetPrimaryItems = async () => {
    const responses = await Promise.all(
      config.map((cfg: any) =>
        callApi({
          url: "StoreCtl/get-inventory-primary-items-list",
          body: buildPrimaryItemPayload(cfg) as any,
        }).unwrap()
      )
    );

    const result = responses.map((res, index) => {
      const itemsArray = Array.isArray(res.object) ? res.object : [];

      return {
        config: config[index],
        items: itemsArray.map((itm: any, i: number) => ({
          ...itm,
          id: i + 1,
          checked: false,
          rcomQty: itm.itemQty,
          touched: itm.rcomQty !== itm.itemQty,
          itemCode: itm.itemCode,
          mainItemCode: itm.mainItemCode,
        })),
      };
    });

    dispatch(
      setPrimaryItems({
        data: result as any,
        configSignature: currentConfigSignature,
      })
    );
  }

  const savePrimaryItems = async (primaryItems: any[]) => {
    let params = {
      data_id: stockDataId || 0,
      cloud_kitchen_id: loginDetails?.cloudKitchenId,
      data_type: "ORDER",
      status: "A",
      data_value: primaryItems,
    }
    return callApi({
      url: `StoreCtl/save-or-update-inventory-data`,
      body: params,
    }).unwrap();
  };

  const handleNext = async () => {
    if (isSaving) return;
    try {
      setIsSaving(true);
      await savePrimaryItems(primaryItemList);
      router.push("/cart");
    } catch (err) {
      alert("Failed to sync data");
    } finally {
      setIsSaving(false);
    }
  };
  ;
  const resetPrimaryItem = async (primaryItems: any[], stockDataId: number) => {
    let params = {
      data_id: stockDataId,
      cloud_kitchen_id: loginDetails?.cloudKitchenId,
      data_type: "ORDER",
      status: "D",
      data_value: primaryItems,
    }
    const res = await callApi({
      url: `StoreCtl/save-or-update-inventory-data`,
      body: params,
    }).unwrap();
    if (res?.status) {
      setstockDataId(0);
      handelGetPrimaryItems()
    }
  };

  // Ensure first tab is selected once data loads
  // useEffect(() => {
  //   if (primaryItemList && primaryItemList.length > 0) {
  //     setKey(0);
  //   }
  // }, [primaryItemList]);

  const normalizeQty = (v: any) => Number(v);
  const normalizeUom = (v: any) => String(v).trim().toLowerCase();
  
  const existingPrimaryItemKeysWithMaster = useMemo(() => {
    if (activeGroupIndex === null) return new Set<string>();

    const set = new Set<string>();
    const group = primaryItemList[activeGroupIndex];

    group?.items.forEach((item: any) => {
      set.add(
        `${item.masterItemCode}_${normalizeQty(item.itemMeasQty)}_${normalizeUom(item.itemMeasDesc)}`
      );
    });

    return set;
  }, [primaryItemList, activeGroupIndex]);

  const existingPrimaryItemKeys = useMemo(() => {
    if (activeGroupIndex === null) return new Set<string>();

    const set = new Set<string>();
    const group = primaryItemList[activeGroupIndex];

    group?.items.forEach((item: any) => {
      set.add(
        `${item.itemCode}_${normalizeQty(item.itemMeasQty)}_${normalizeUom(item.itemMeasDesc)}`
      );
    });

    return set;
  }, [primaryItemList, activeGroupIndex]);

  useEffect(() => {

    if (!newItemModal || activeGroupIndex === null) return;

    const freshItems: OrderRow[] = availableItems
      .filter((itm: any) => {
        const key = `${itm.masterItemCode}_${normalizeQty(itm.qty)}_${normalizeUom(itm.uom)}`;
        return !existingPrimaryItemKeysWithMaster.has(key);
      })
      .filter((itm: any) => {
        const key = `${itm.itemCode}_${normalizeQty(itm.qty)}_${normalizeUom(itm.uom)}`;
        return !existingPrimaryItemKeys.has(key);
      })
      .map((itm: any, idx: number) => ({
        id: idx + 1,
        momName:itm.momName,
        itemName: itm.itemName,
        itemCode: itm.itemCode,
        itemQty: 0,
        rcomQty: 0,
        qty: itm.qty,
        uom: itm.uom,
        itemMeasCode:itm.measCode,
        vegType: itm.vegType,
        checked: false,
        availableStock: itm.availableStock
      }));
    setModalItems(freshItems);
  }, [newItemModal, activeGroupIndex, availableItems, existingPrimaryItemKeysWithMaster, existingPrimaryItemKeys]);

  const filteredModalItems = useMemo(() => {
    let result = [...modalItems];

    // Search
    if (modalAppliedSearch.trim()) {
      const s = modalAppliedSearch.toLowerCase();
      result = result.filter(item =>
        item.itemName?.toLowerCase().includes(s) ||
        String(item.itemCode).includes(s)
      );
    }

    // Stock filter using availableStock
    if (filterWithStock && !filterWithoutStock) {
      result = result.filter(item => Number(item.availableStock) > 0);
    }

    if (!filterWithStock && filterWithoutStock) {
      result = result.filter(item => Number(item.availableStock) === 0);
    }

    return result;
  }, [
    modalItems,
    modalAppliedSearch,
    filterWithStock,
    filterWithoutStock,
  ]);

  const modalSuggestions = useMemo(() => {
    if (!modalSearchInput) return [];

    const lower = modalSearchInput.toLowerCase();
    const set = new Set<string>();

    availableItems.forEach((itm: any) => {
      if (itm.itemName?.toLowerCase().includes(lower)) set.add(itm.itemName);
      if (itm.momName?.toLowerCase().includes(lower)) set.add(itm.momName);
      if (itm.vegType?.toLowerCase().includes(lower)) set.add(itm.vegType);
    });

    return Array.from(set).slice(0, 8);
  }, [modalSearchInput, availableItems]);


  const toggleModalItem = (id: number) => {
    setModalItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const applyModalBulkQty = (
    operator: "+" | "-",
    value: number,
    mode: "VALUE" | "PERCENT"
  ) => {
    setModalItems(prev =>
      prev.map(item => {
        if (!item.checked) return item;

        let delta = value;

        if (mode === "PERCENT") {
          delta = Math.round((item.rcomQty * value) / 100);
        }

        const newQty =
          operator === "+"
            ? item.rcomQty + delta
            : Math.max(0, item.rcomQty - delta);

        return { ...item, rcomQty: newQty };
      })
    );
  };

  useEffect(() => {
    if (!modalSearchInput) {
      setModalAppliedSearch("");
    }
  }, [modalSearchInput]);

  const handleAddSelectedItems = () => {
    if (activeGroupIndex === null) return;

    modalItems
      .filter(item => item.checked)
      .forEach(item => {
        dispatch(
          addItemToGroup({
            groupIndex: activeGroupIndex,
            item: {
              id: 0,
              momName: item.momName,
              itemName: item.itemName,
              itemCode: item.itemCode,
              itemQty: 0,
              rcomQty: item.rcomQty,
              itemMeasQty: item.qty,
              itemMeasCode:item.itemMeasCode,
              itemMeasDesc: item.uom,
              vegType: item.vegType,
              checked: false,
              touched: item.rcomQty !== 0
            },
          })
        );
      });

    setnewItemModal(false);
    setItemSearchText("");
    setModalItems([]);
  };

  const modalRows: OrderRow[] = useMemo(() => {
    return filteredModalItems.map(itm => ({
      ...itm,
      id: itm.id,
      checked: itm.checked,
    }));
  }, [filteredModalItems]);

  const modalCheckedCount = useMemo(
    () => modalItems.filter(i => i.checked).length,
    [modalItems]
  );


  const modalColumns: TableColumn<OrderRow>[] = useMemo(
    () => [
      {
        name: (
          <Form.Check
            type="checkbox"
            className="rb-orange-check"
            checked={
              modalItems.length > 0 &&
              modalItems.every(item => item.checked)
            }
            onChange={(e) => {
              const checked = e.target.checked;
              setModalItems(prev =>
                prev.map(item => ({ ...item, checked: checked }))
              );
            }}
          />
        ),
        selector: (row) => row.checked,
        width: "60px",
        cell: (row) => (
          <Form.Check
            type="checkbox"
            className="rb-orange-check"
            checked={row.checked}
            onChange={() => toggleModalItem(row.id)}
          />
        ),
      },
      {
        name: "#",
        selector: (row) => row.id,
        width: "60px",
        sortable: true,
        cell: (row) => (
          <span>{row.id}</span>
        ),
      },
      {
        name: "Mom",
        width: "100px",
        sortable: true,
        cell: (row) => (
          <span>{row.momName}</span>
        ),
      },
      {
        name: "Event",
        width: "120px",
        sortable: true,
        cell: (row) => (
          <span>-</span>
        ),
      },
      {
        name: "Item",
        selector: (row) => row.itemName,
        sortable: true,
        cell: (row) => (
          <span>{row.itemName}</span>
        ),
      },
      {
        name: "UOM",
        width: "100px",
        center: true,
        cell: (row) => (
          <span>{`${row.qty}${row.uom}`}</span>
        ),
      },
      {
        name: "Actual Orders",
        selector: (row) => row.itemQty,
        width: "200px",
        sortable: true,
        center: true,
        cell: (row) => (
          <span>{row.itemQty}</span>
        ),
      },
      {
        name: "Recommended Orders",
        selector: (row) => row.rcomQty,
        width: "220px",
        sortable: true,
        center: true,
        cell: (row) => (
          <Form.Control
            type="number"
            className="text-center"
            value={row.rcomQty}
            onChange={(e) => {
              const value = Number(e.target.value);
              setModalItems(prev =>
                prev.map(itm =>
                  itm.id === row.id ? { ...itm, rcomQty: value, checked:true } : itm
                )
              );

            }}
          />
        ),
      },
      {
        name: "Food Type",
        width: "120px",
        center: true,
        cell: (row) => (
          <span>{row.vegType}</span>
        ),
      },
    ],
    [modalItems]
  );

  const untouchedCount = useMemo(() => {
    const group = primaryItemList?.[Number(key)];
    if (!group) return 0;

    return group.items.filter((item: any) => !item.touched).length;
  }, [primaryItemList, key]);

  const selectedGroup = primaryItemList?.[Number(key)];

  const untouchedModalRows: OrderRow[] = useMemo(() => {
    if (!selectedGroup) return [];

    let rows = selectedGroup.items
      .filter((item: any) => !item.touched)
      .map((item: any) => ({
        ...item,
        checked: item.checked ?? false,
        groupIndex: Number(key),
      }));

    if (untouchAppliedSearch.trim()) {
      const s = untouchAppliedSearch.toLowerCase();
      rows = rows.filter(item =>
        item.itemName?.toLowerCase().includes(s) ||
        item.momName?.toLowerCase().includes(s) ||
        item.platform?.toLowerCase().includes(s) ||
        item.mainItemName?.toLowerCase().includes(s)
      );
    }

    return rows;
  }, [selectedGroup, key, untouchAppliedSearch]);

  useEffect(() => {
    if (!untouchSearchInput) {
      setuntouchAppliedSearch("");
    }
  }, [untouchSearchInput]);

  const untouchedSuggestions = useMemo(() => {
  if (!untouchSearchInput || !selectedGroup) return [];

  const lower = untouchSearchInput.toLowerCase();
  const set = new Set<string>();

  selectedGroup.items
    .filter((item: any) => !item.touched)
    .forEach((item: any) => {
      if (item.itemName?.toLowerCase().includes(lower)) set.add(item.itemName);
      if (item.momName?.toLowerCase().includes(lower)) set.add(item.momName);
      if (item.platform?.toLowerCase().includes(lower)) set.add(item.platform);
      if (item.mainItemName?.toLowerCase().includes(lower)) set.add(item.mainItemName);
    });

  return Array.from(set).slice(0, 8);
}, [untouchSearchInput, selectedGroup]);

  const untouchedColumns: TableColumn<OrderRow>[] = useMemo(
    () => [
      {
        name: (
          <Form.Check
            type="checkbox"
            className="rb-orange-check"
            checked={
              untouchedModalRows.length > 0 &&
              untouchedModalRows.every(itm => itm.checked)
            }
            onChange={(e) => {
              const visibleIds = untouchedModalRows.map(itm => itm.id);

              dispatch(
                selectSpecificItems({
                  groupIndex: Number(key),
                  itemIds: visibleIds,
                  checked: e.target.checked,
                })
              );
            }}
          />
        ),
        selector: row => row.checked,
        width: "60px",
        cell: row => (
          <Form.Check
            type="checkbox"
            className="rb-orange-check"
            checked={row.checked}
            onChange={() =>
              dispatch(
                toggleItem({
                  groupIndex: row.groupIndex,
                  itemId: row.id,
                })
              )
            }
          />
        ),
      },
      {
        name: "#",
        selector: (row) => row.id,
        width: "60px",
        sortable: true,
        cell: (row) => (
          <span
            className={`${row.itemQty < row.rcomQty
              ? "text-green"
              : row.itemQty > row.rcomQty
                ? "text-secondary"
                : ""
              }`}
          >
            {row.id}
          </span>
        ),
      },
      {
        name: "Mom",
        selector: (row) => row.momName,
        sortable: true,
        width: "100px",
        center: true,
        cell: (row) => (
          <span
            className={`${row.itemQty < row.rcomQty
              ? "text-green"
              : row.itemQty > row.rcomQty
                ? "text-secondary"
                : ""
              }`}
          >
            {row.momName}
          </span>
        ),
      },
      {
        name: "Event/Bundle",
        selector: (row) => row.mainItemName,
        sortable: true,
        width: "200px",
        center: true,
        cell: (row) => (
          <span
            className={`${row.itemQty < row.rcomQty
              ? "text-green"
              : row.itemQty > row.rcomQty
                ? "text-secondary"
                : ""
              }`}
          >
            {row.platform == "Event" || row.itemCode !== row.mainItemCode
              ? row.mainItemName
              : "-"}
          </span>
        ),
      },
      {
        name: "Item",
        selector: (row) => row.itemName,
        // width: "250px",
        sortable: true,
        cell: (row) => (
          <span
            className={`${row.itemQty < row.rcomQty
              ? "text-green"
              : row.itemQty > row.rcomQty
                ? "text-secondary"
                : ""
              }`}
          >
            {row.itemName}
          </span>
        ),
      },
      {
        name: "UOM",
        width: "100px",
        center: true,
        cell: (row) => (
          <span
            className={`${row.itemQty < row.rcomQty
              ? "text-green"
              : row.itemQty > row.rcomQty
                ? "text-secondary"
                : ""
              }`}
          >
            {`${row?.itemMeasQty}${row?.itemMeasDesc}`}
          </span>
        ),
      },
      {
        name: "Actual Orders",
        selector: (row) => row.itemQty,
        width: "200px",
        sortable: true,
        center: true,
        cell: (row) => (
          <span
            className={`${row.itemQty < row.rcomQty
              ? "text-green"
              : row.itemQty > row.rcomQty
                ? "text-secondary"
                : ""
              }`}
          >
            {row.itemQty}
          </span>
        ),
      },
      {
        name: "Recommended Orders",
        selector: (row) => row.rcomQty,
        width: "220px",
        cell: (row) => (
          <Form.Control
            type="number"
            className="text-center"
            value={row.rcomQty}
            onChange={(e) =>
              dispatch(
                updateItemQty({
                  groupIndex: row.groupIndex,
                  itemId: row.id,
                  qty: e.target.value === "" ? "" : Number(e.target.value),
                  direct:false
                })
              )
            }
          />
        ),
      },
      {
        name: "Food Type",
        width: "120px",
        center: true,
        cell: (row) => (
          <span
            className={`${row.itemQty < row.rcomQty
              ? "text-green"
              : row.itemQty > row.rcomQty
                ? "text-secondary"
                : ""
              }`}
          >
            {row.vegType}
          </span>
        ),
      },
    ],
    [dispatch, key, untouchedModalRows]
  );

  const handleAddItemExcelDownload = () => {
    if (!modalRows.length) return;

    const data = modalRows.map((item, idx) => ({
      id: idx + 1,
      momName: item.momName,
      itemCode: item.itemCode,
      itemName: item.itemName,
      uom: `${item.qty} ${item.uom}`,
      itemQty: 0,
      rcomQty: item.rcomQty,
      vegType: item.vegType
    }));

    exportToExcel(
      {
        sheetName: "Add Items",
        data,
        columns: COMMON_EXCEL_COLUMNS,
      },
      "Add_Items"
    );
  };
  const handleUntouchedExcelDownload = () => {
    if (!selectedGroup) return;

    const data = selectedGroup.items
      .filter((item: any) => !item.touched)
      .map((item: any, idx: number) => ({
        id: idx + 1,
        momName: item.momName,
        itemCode: item.itemCode,
        itemName: item.itemName,
        uom: `${item.itemMeasQty} ${item.itemMeasDesc}`,
        itemQty: item.itemQty,
        rcomQty: item.rcomQty,
        vegType: item.vegType
      }));

    if (!data.length) return;

    exportToExcel(
      {
        sheetName: getDayName(new Date(selectedGroup.config.date as string)),
        data,
        columns: COMMON_EXCEL_COLUMNS,
      },
      `Untouched_Primary_Items_${getDayName(
        new Date(selectedGroup.config.date as string)
      )}`
    );
  };

  return (
    <Container fluid className="p-4">
      <Row>
        <Col>
          <div className="d-flex align-items-center">
            <Image
              src={"/inventorymanagement/back-icon.svg"}
              height={24}
              width={24}
              alt={"backicon"}
              onClick={() => {
                router.push("/config");
              }}
              style={{ cursor: "pointer" }}
            />
            <span className="font-24 fw-bold ms-3">
              Sales Projections Of Primary Items
            </span>
          </div>
        </Col>
        <Col className="d-flex align-items-stretch justify-content-end">
          <div className="d-flex align-items-center justify-content-between bg-danger text-white px-3 py-1 rounded-3 me-2 cursor-pointer" onClick={() => { setuntouchedModal(true) }}>
            <div className="d-flex align-items-center gap-2 me-3">
              <span
                className="d-inline-flex align-items-center justify-content-center bg-white text-danger fw-bold rounded-circle"
                style={{ width: "18px", height: "18px", fontSize: "12px" }}
              >
                i
              </span>
              <span className="font-16 fw-bold">{untouchedCount} Untouched Items</span>
            </div>

            <Button className="btn-outline text-primary font-13 fw-bold border-0 rounded-3">
              View Items
            </Button>
          </div>

          {stockDataId ? <Button
            className="btn-outline me-2"
            onClick={() => {
              resetPrimaryItem(primaryItemList, stockDataId)
            }}
          >
            Reset
          </Button> : ""}
          <Button
            className={`btn-filled ${isSaving ? "btn-loading" : ""}`}
            disabled={isSaving}
            onClick={() => {
              handleNext()
            }}
          >
            Next
          </Button>
        </Col>
      </Row>

      <Row className="mt-3">
        <Col>
          <Tabs
            id="primary-items-tabs"
            activeKey={key}
            onSelect={(k) => setKey(k || 0)}
            className={"mb-3 custom-tabs"}
            variant="tabs"
          >
            {primaryItemList?.map((con: any, groupIndex: number) => (
              <Tab
                eventKey={groupIndex}
                title={`${getDayName(new Date(con.config.date))} (${formatDate(
                  con.config.date
                )})`}
                key={groupIndex}
              >
                <Row>
                  <PrimaryItemGroup
                    groupIndex={groupIndex}
                    con={con}
                    dispatch={dispatch}
                    isLoading={isLoading}
                    onAddClick={() => {
                      setActiveGroupIndex(groupIndex);
                      setnewItemModal(true);
                    }}
                  />
                </Row>
              </Tab>
            ))}
          </Tabs>
        </Col>
      </Row>

      {/* Global Filter Modal */}
      <Modal
        show={filterModal}
        onHide={() => {
          setfilterModal(false);
        }}
        centered
      >
        <Modal.Header className="border-0">
          <Modal.Title className="font-18 fw-bold">Filter</Modal.Title>
        </Modal.Header>
        <Modal.Body className="border-0">
          <Row>
            <div className="d-flex mb-3">
              <Form.Check
                type="radio"
                name="filterType"
                id="online"
                label="Online"
                className="me-4 fw-bold"
                checked={filterType === "online"}
                onChange={() => setFilterType("online")}
              />
              <Form.Check
                type="radio"
                name="filterType"
                id="event"
                label="Event"
                className="fw-bold"
                checked={filterType === "event"}
                onChange={() => setFilterType("event")}
              />
            </div>
          </Row>
          <Form.Select className="mb-3">
            <option></option>
          </Form.Select>
          <Form.Select className="mb-3">
            <option>Veg, Non Veg</option>
          </Form.Select>
          <div className="filter-segment">
            <div className="segment">
              <Form.Select
                className="segment-select"
                value={operator}
                onChange={(e) => setOperator(e.target.value as "+" | "-")}
              >
                <option value="+">+</option>
                <option value="-">-</option>
              </Form.Select>
            </div>
            <div className="segment">
              <Form.Control
                type="number"
                className="segment-input"
                value={percentage}
                onChange={(e) => setPercentage(Number(e.target.value))}
                placeholder="0"
              />
            </div>
            <div className="segment percent">%</div>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button
            className="btn-outline px-4"
            onClick={() => {
              setfilterModal(false);
            }}
          >
            Cancel
          </Button>
          <Button
            className="btn-filled"
            onClick={() => {
              if (!percentage) return;
              dispatch(bulkUpdateRcomQty({ filterType, operator, percentage }));
              setfilterModal(false);
            }}
          >
            Apply
          </Button>
        </Modal.Footer>
      </Modal>

      {/* New Item Modal */}
      <Modal
        show={newItemModal}
        onHide={() => {
          setnewItemModal(false);
          setSelectedItem(null);
          setItemSearchText("");
        }}
        fullscreen
        backdrop="static"
      >
        <Modal.Header className="border-0 d-flex align-items-center justify-content-start py-2 border-bottom">
          <Image src="/inventorymanagement/x-mark.svg" height={12} width={12} alt="" onClick={() => { setnewItemModal(false); setSelectedItem(null); setItemSearchText("") }} />
          <Modal.Title className="font-14 m-0 ms-3">
            Add Items
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="border-0">
          <Row className="pb-3">
            <Col>
              <h4 className="font-24 fw-bold">Add Items</h4>
            </Col>
            <Col className="d-flex align-items-center justify-content-end">
              <div className="d-flex aling-items-center me-2">
                <Form.Check
                  type="checkbox"
                  className="rb-orange-check me-2"
                  checked={filterWithStock}
                  onChange={(e) => setFilterWithStock(e.target.checked)}
                />
                <p className="font-13 m-0">Unsold items with stock</p>
              </div>
              <div className="d-flex aling-items-center me-2">
                <Form.Check
                  type="checkbox"
                  className="rb-orange-check me-2"
                  checked={filterWithoutStock}
                  onChange={(e) => setFilterWithoutStock(e.target.checked)}
                />
                <p className="font-13 m-0">Unsold items without stock</p>
              </div>
              <Button className="btn-filled h-100" disabled={!modalItems.some(item => item.checked)} onClick={() => handleAddSelectedItems()}>
                Add Item
              </Button>
            </Col>
          </Row>
          <div className="add-items-body">
            <Col xs={12} md={12}>
              <div className="d-flex flex-column my-3 p-3 border rounded bg-light">
                <Row className="g-2 align-items-center">
                  <Col xs={12} md={7}>
                    <InputGroup>

                      <div className="position-relative flex-grow-1">
                        <Form.Control
                          type="search"
                          placeholder="Search items, platform, event, food type..."
                          className="border-end-0 rounded-end-0 ps-2"
                          onChange={(e) => {
                            setModalSearchInput(e.target.value);
                            setShowModalSuggestions(true);
                          }}
                          onFocus={() => setShowModalSuggestions(true)}
                        />

                        {showModalSuggestions && modalSuggestions.length > 0 && (
                          <div className="position-absolute bg-white border rounded w-100 mt-1 z-3">
                            {modalSuggestions.map((sug, i) => (
                              <div
                                key={i}
                                className="px-3 py-2 cursor-pointer hover-bg"
                                onClick={() => {
                                  setModalAppliedSearch(sug);
                                  setModalSearchInput(sug);
                                  setShowModalSuggestions(false);
                                }}
                              >
                                {sug}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <InputGroup.Text className="bg-white border-start-0 rounded-end-1">
                        <Image
                          src={"/inventorymanagement/search_black.svg"}
                          height={16}
                          width={16}
                          alt="search"
                        />
                      </InputGroup.Text>
                    </InputGroup>
                  </Col>

                  {/* Inline Bulk Update Controls (Visible only when items are selected) */}
                  <Col xs={12} md={5} className="d-flex">
                    <div className="d-flex align-items-stretch bg-white border rounded p-1">
                      <div className="d-flex align-items-center">
                        <span className="font-12 fw-bold text-nowrap px-2">
                          Selected ({modalCheckedCount}):
                        </span>

                        {/* Operator Selector */}
                        <Form.Select
                          size="sm"
                          style={{ width: "60px" }}
                          value={modalOperator}
                          onChange={(e) => setModalOperator(e.target.value as "+" | "-")}
                          className="me-1 border-0 bg-light"
                        >
                          <option value="+">+</option>
                          <option value="-">-</option>
                        </Form.Select>

                        {/* Input with Qty/% Toggle */}
                        <InputGroup
                          size="sm"
                          className="me-1"
                          style={{ maxWidth: "150px" }}
                        >
                          <Form.Control
                            type="number"
                            placeholder="0"
                            value={modalBulkQty}
                            onChange={(e) => setModalBulkQty(Number(e.target.value))}
                          />
                          <Form.Select
                            style={{ width: "60px", backgroundColor: "#f8f9fa" }}
                            value={modalBulkMode}
                            onChange={(e) =>
                              setModalBulkMode(e.target.value as "VALUE" | "PERCENT")
                            }
                          >
                            <option value="VALUE">Qty</option>
                            <option value="PERCENT">%</option>
                          </Form.Select>
                        </InputGroup>
                      </div>
                      <div className="d-flex align-items-stretch">
                        <Button
                          className="btn-filled py-0 font-12"
                          disabled={!modalBulkQty}
                          onClick={() =>
                            applyModalBulkQty(
                              modalOperator,
                              Number(modalBulkQty),
                              modalBulkMode
                            )
                          }
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                    <div className="d-flex align-items-stretch">
                      <Button
                        className="btn-outline text-capitalize mb-1 mb-md-0 fw-bold h-100 ms-2"
                        onClick={() => { handleAddItemExcelDownload() }}
                      >
                        Download as excel
                      </Button>
                    </div>
                  </Col>
                  {/* )} */}
                </Row>
              </div>

              <Datatable<OrderRow>
                columns={modalColumns}
                rowData={modalRows}
                progressPending={isLoading}
                pagination={true}
              />
            </Col>
          </div>
        </Modal.Body>
      </Modal>

      <Modal
        show={untouchedModal}
        onHide={() => {
          setuntouchedModal(false);
          setSelectedItem(null);
          setItemSearchText("");
          dispatch(
            markSelectedAsTouched({
              groupIndex: Number(key),
              modalClose:true
            })
          );
        }}
        fullscreen
        backdrop="static"
      >
        <Modal.Header className="border-0 d-flex align-items-center justify-content-start py-2 border-bottom">
          <Image src="/inventorymanagement/x-mark.svg" height={12} width={12} alt="" onClick={() => { 
            setuntouchedModal(false); 
            setSelectedItem(null); 
            setItemSearchText("")
            dispatch(
            markSelectedAsTouched({
              groupIndex: Number(key),
              modalClose:true
            })
          );
             }} />
          <Modal.Title className="font-14 m-0 ms-3">
            Add Items
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="border-0">
          <Row className="pb-3">
            <Col>
              <h4 className="font-24 fw-bold">{untouchedModalRows.length} Untouched Items</h4>
            </Col>
            <Col className="d-flex align-items-center justify-content-end">
              <Button
                className="btn-filled h-100"
                disabled={
                  !untouchedModalRows.some(row => row.checked)
                }
                onClick={() => {
                  dispatch(
                    markSelectedAsTouched({
                      groupIndex: Number(key),
                      modalClose:false
                    })
                  );
                  setuntouchedModal(false);
                }}
              >
                Mark Touched
              </Button>
            </Col>
          </Row>
          <div className="add-items-body">
            <Col xs={12} md={12}>
              <div className="d-flex flex-column my-3 p-3 border rounded bg-light">
                <Row className="g-2 align-items-center">
                  <Col xs={12} md={7}>
                    <InputGroup>

                      <div className="position-relative flex-grow-1">
                        <Form.Control
                          type="search"
                          placeholder="Search items, platform, event, food type..."
                          className="border-end-0 rounded-end-0 ps-2"
                          value={untouchSearchInput}
                          onChange={(e) => {
                            setuntouchSearchInput(e.target.value);
                            setShowuntouchSuggestions(true);
                          }}
                          onFocus={() => setShowuntouchSuggestions(true)}
                        />

                        {showuntouchSuggestions && untouchedSuggestions.length > 0 && (
                          <div className="position-absolute bg-white border rounded w-100 mt-1 z-3">
                            {untouchedSuggestions.map((sug, i) => (
                              <div
                                key={i}
                                className="px-3 py-2 cursor-pointer hover-bg"
                                onClick={() => {
                                  setuntouchAppliedSearch(sug);
                                  setuntouchSearchInput(sug);
                                  setShowuntouchSuggestions(false);
                                }}
                              >
                                {sug}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <InputGroup.Text className="bg-white border-start-0 rounded-end-1">
                        <Image
                          src={"/inventorymanagement/search_black.svg"}
                          height={16}
                          width={16}
                          alt="search"
                        />
                      </InputGroup.Text>
                    </InputGroup>
                  </Col>

                  {/* Inline Bulk Update Controls (Visible only when items are selected) */}
                  <Col xs={12} md={5} className="d-flex">
                    <div className="d-flex align-items-stretch bg-white border rounded p-1">
                      <div className="d-flex align-items-center">
                        <span className="font-12 fw-bold text-nowrap px-2">
                          Selected (
                          {
                            selectedGroup?.items.filter(
                              (item: any) => !item.touched && item.checked
                            ).length
                          }
                          ):
                        </span>

                        {/* Operator Selector */}
                        <Form.Select
                          size="sm"
                          style={{ width: "60px" }}
                          value={untouchOperator}
                          onChange={(e) =>
                            setuntouchOperator(e.target.value as "+" | "-")
                          }
                          className="me-1 border-0 bg-light"
                        >
                          <option value="+">+</option>
                          <option value="-">-</option>
                        </Form.Select>

                        {/* Input with Qty/% Toggle */}
                        <InputGroup size="sm" className="me-1" style={{ maxWidth: "150px" }}>
                          <Form.Control
                            type="number"
                            placeholder="0"
                            value={untouchBulkQty}
                            onChange={(e) =>
                              setuntouchBulkQty(
                                e.target.value === "" ? "" : Number(e.target.value)
                              )
                            }
                          />
                          <Form.Select
                            style={{ width: "60px", backgroundColor: "#f8f9fa" }}
                            value={untouchBulkMode}
                            onChange={(e) =>
                              setuntouchBulkMode(e.target.value as "VALUE" | "PERCENT")
                            }
                          >
                            <option value="VALUE">Qty</option>
                            <option value="PERCENT">%</option>
                          </Form.Select>
                        </InputGroup>
                      </div>

                      <div className="d-flex align-items-stretch">
                        <Button
                          className="btn-filled py-0 font-12"
                          disabled={
                            !untouchBulkQty ||
                            !selectedGroup?.items.some(
                              (i: any) => !i.touched && i.checked
                            )
                          }
                          onClick={() =>
                            dispatch(
                              applyMathToSelected({
                                groupIndex: Number(key),
                                operator: untouchOperator,
                                value: Number(untouchBulkQty),
                                mode: untouchBulkMode,
                                direct:false
                              })
                            )
                          }
                        >
                          Apply
                        </Button>
                      </div>
                    </div>

                    <div className="d-flex align-items-stretch">
                      <Button
                        className="btn-outline text-capitalize mb-1 mb-md-0 fw-bold h-100 ms-2"
                        onClick={() => { handleUntouchedExcelDownload() }}
                      >
                        Download as excel
                      </Button>
                    </div>
                  </Col>

                  {/* )} */}
                </Row>
              </div>

              <Datatable<OrderRow>
                columns={untouchedColumns}
                rowData={untouchedModalRows}
                progressPending={isLoading}
                pagination={true}
              />
            </Col>
          </div>
        </Modal.Body>
      </Modal>
    </Container>
  );
}
