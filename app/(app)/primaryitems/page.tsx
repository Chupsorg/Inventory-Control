"use client";
import React, { useEffect, useState, useMemo } from "react";
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
} from "@/app/store/features/primaryItemsSlice";

type OrderRow = {
  id: number;
  itemName: string;
  mainItemName: string;
  vegType: "Veg" | "Non-Veg";
  platform: string;
  itemQty: number;
  rcomQty: number;
  UOM: string;
  itemMeasQty: string;
  itemMeasDesc: string;
  groupIndex: number;
  checked: boolean;
};

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

    con.items.forEach((item: any) => {
      if (item.itemName?.toLowerCase().includes(lower)) {
        set.add(item.itemName);
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
  }, [searchInput, con.items]);

  // 1. Filter items based on search term
  const filteredItems = useMemo(() => {
    let result = con.items;

    if (appliedSearch) {
      const lower = appliedSearch.toLowerCase();

      result = result.filter((item: any) => {
        if (item.vegType && item.vegType.toLowerCase() === lower) {
          return true;
        }
        return (
          item.itemName?.toLowerCase().includes(lower) ||
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
  }, [con.items, appliedSearch, isQtyFilterApplied, qtyOperator, qtyValue]);

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
    if (!bulkValue) return;
    dispatch(
      applyMathToSelected({
        groupIndex,
        operator: localOperator,
        value: Number(bulkValue),
        mode: bulkMode,
      })
    );
    setBulkValue("");
  };

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
            className={`${
              row.itemQty < row.rcomQty
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
        name: "Item",
        selector: (row) => row.itemName,
        width: "250px",
        sortable: true,
        cell: (row) => (
          <span
            className={`${
              row.itemQty < row.rcomQty
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
        name: "Platform",
        selector: (row) => row.platform,
        sortable: true,
        center: true,
        cell: (row) => (
          <span
            className={`${
              row.itemQty < row.rcomQty
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
      {
        name: "Event",
        selector: (row) => (row.platform == "Event" ? row.mainItemName : "-"),
        sortable: true,
        width: "250px",
        center: true,
        cell: (row) => (
          <span
            className={`${
              row.itemQty < row.rcomQty
                ? "text-green"
                : row.itemQty > row.rcomQty
                ? "text-secondary"
                : ""
            }`}
          >
            {row.platform == "Event" ? row.mainItemName : "-"}
          </span>
        ),
      },
      {
        name: "Food Type",
        selector: (row) => row.vegType,
        sortable: true,
        center: true,
        cell: (row) => (
          <span
            className={`${
              row.itemQty < row.rcomQty
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
        name: "Previous Orders",
        selector: (row) => row.itemQty,
        sortable: true,
        center: true,
        cell: (row) => (
          <span
            className={`${
              row.itemQty < row.rcomQty
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
            className={`text-center ${
              row.itemQty < row.rcomQty
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
                  qty: Number(e.target.value),
                })
              )
            }
          />
        ),
      },
      {
        name: "UOM",
        width: "100px",
        center: true,
        cell: (row) => (
          <span
            className={`${
              row.itemQty < row.rcomQty
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
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groupIndex, filteredItems, isAllVisibleSelected, dispatch]
  );

  const orderRows: OrderRow[] = filteredItems.map((item: any) => ({
    id: item.id,
    itemName: item.itemName,
    platform: item.platform,
    mainItemName: item.mainItemName,
    vegType: item.vegType,
    itemQty: item.itemQty,
    rcomQty: item.rcomQty,
    UOM: item.UOM,
    itemMeasQty: item.itemMeasQty,
    itemMeasDesc: item.itemMeasDesc,
    groupIndex,
    checked: item.checked ?? false,
  }));

  const checkedCount = con.items.filter((i: any) => i.checked).length;
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
              {filteredItems.length}/{con.items.length})
            </h4>
            <p className="m-0 font-13">
              {formatDate(con.config.date as string)}
            </p>
          </div>
          <div>
            <div className="d-flex align-items-center gap-2 mt-2">
              <Form.Select
                size="sm"
                style={{ width: "80px" }}
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
                size="sm"
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
                  size="sm"
                  className="btn-filled p-1 font-12"
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
          </div>
        </div>

        {/* Search and Bulk Actions Row */}
        <Row className="g-2 align-items-center">
          {/* Search Bar + ADD BUTTON */}
          <Col xs={12} md={checkedCount > 0 ? 6 : 12}>
            <InputGroup>
              <InputGroup.Text className="bg-white border-end-0">
                <Image
                  src={"/inventorymanagement/search_black.svg"}
                  height={16}
                  width={16}
                  alt="search"
                />
              </InputGroup.Text>
              <div className="position-relative flex-grow-1">
                <Form.Control
                  type="search"
                  placeholder="Search items, platform, event, food type..."
                  className="border-start-0 rounded-start-0 ps-0"
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
              <div
                className="border rounded-2 ms-2 p-2 bg-white cursor-pointer"
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
            <Col xs={12} md={6}>
              <div className="d-flex align-items-center bg-white border rounded p-1">
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

                <Button
                  size="sm"
                  className="btn-filled py-0 font-12"
                  onClick={handleLocalBulkUpdate}
                  disabled={!bulkValue}
                >
                  Apply
                </Button>
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
    availableItems,
  } = useSelector((state: RootState) => state.primaryItems);

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

  const filteredItemList = useMemo(() => {
    const search = itemSearchText.toLowerCase().trim();

    if (!search) return availableItems || [];

    return availableItems.filter((itm: any) => {
      const name = (itm.itemName || "").toString().toLowerCase();
      const code = (itm.itemCode || "").toString().toLowerCase();
      return name.includes(search) || code.includes(search);
    });
  }, [availableItems, itemSearchText]);

  const buildPrimaryItemPayload = (cfg: any) => {
    return {
      cloud_kitchen_id: loginDetails?.cloudKitchenId,
      delivery_date: new Date(cfg.date).toISOString().split("T")[0],
      sale_days: cfg.days,
      previous_week_count: 1,
      sale_dates: cfg.custom_date_range,
    };
  };

  const handleAddNewItem = () => {
    if (!selectedItem || activeGroupIndex === null) return;

    const newItem = {
      id: 0,
      itemName: selectedItem.itemName,
      itemCode: selectedItem.itemCode,
      mainItemCode: 0,
      mainItemName: "",
      vegType: selectedItem.vegType || "Veg",
      platform: "",
      itemQty: 0,
      rcomQty: 0,
      UOM: selectedItem.uom,
      itemMeasCode: selectedItem.measCode,
      itemMeasQty: selectedItem.qty,
      itemMeasDesc: selectedItem.uom,
      checked: false,
    };

    dispatch(addItemToGroup({ groupIndex: activeGroupIndex, item: newItem }));

    // Reset and close
    setSelectedItem(null);
    setnewItemModal(false);
    setItemSearchText("");
  };

  useEffect(() => {
    if (!loginDetails || !config?.length) return;

    const fetchAll = async () => {
      // 1. Fetch Primary Items (Main Table) if not yet fetched
      if (!isFetched) {
        try {
          const responses = await Promise.all(
            config.map((cfg: any) =>
              callApi({
                url: "StoreCtl/get-inventory-primary-items-list",
                body: buildPrimaryItemPayload(cfg) as any,
              }).unwrap()
            )
          );

          const result = responses.map((res, index) => ({
            config: config[index],
            items: (res.object as any)?.map((itm: any, i: number) => ({
              ...itm,
              id: i + 1,
              checked: false,
              rcomQty: itm.itemQty,
            })),
          }));

          dispatch(setPrimaryItems(result as any));
        } catch (err) {
          console.error(err);
        }
      }

      // 2. Fetch Available/Kitchen Items (Dropdown) if empty
      // We check availableItems.length so we don't re-fetch if they exist
      if (!availableItems || availableItems.length === 0) {
        try {
          const res = await callApi({
            url: `StoreCtl/get-kitchen-primary-items-list/${loginDetails?.cloudKitchenId}`,
          }).unwrap();
          if (res?.status) {
            // Dispatch to Redux store instead of local state
            dispatch(setAvailableItems((res.object as any) || []));
          }
        } catch (error) {
          console.error("Failed to fetch item list", error);
        }
      }
    };

    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, loginDetails, isFetched, availableItems?.length]);

  // Ensure first tab is selected once data loads
  useEffect(() => {
    if (primaryItemList && primaryItemList.length > 0) {
      setKey(0);
    }
  }, [primaryItemList]);

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
        <Col className="d-flex align-items-center justify-content-end">
          <Button
            className="btn-filled"
            onClick={() => {
              router.push("/cart");
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
        centered
      >
        <Modal.Header className="border-0">
          <Modal.Title className="font-18 fw-bold">Add New Item</Modal.Title>
        </Modal.Header>
        <Modal.Body className="border-0">
          <div className="mb-3">
            <Form.Control
              type="search"
              placeholder="Search item name or code..."
              value={itemSearchText}
              onChange={(e) => setItemSearchText(e.target.value)}
              className="mb-2"
              autoFocus
            />

            <div
              className="border rounded overflow-auto"
              style={{ maxHeight: "250px" }}
            >
              {filteredItemList.length === 0 ? (
                <div className="p-3 text-center text-muted">No items found</div>
              ) : (
                filteredItemList.map((itm: any) => {
                  const uniqueKey = `${itm.itemCode}-${itm.measQty}${itm.uom}`;

                  const isSelected =
                    selectedItem &&
                    selectedItem.itemCode === itm.itemCode &&
                    selectedItem.measQty === itm.measQty &&
                    selectedItem.uom === itm.uom;

                  return (
                    <div
                      key={uniqueKey}
                      className={`p-2 border-bottom cursor-pointer ${
                        isSelected ? "bg-primary text-white" : "hover-bg-light"
                      }`}
                      onClick={() => setSelectedItem(itm)}
                    >
                      <div className="fw-bold">{itm.itemName}</div>
                      <div
                        className="font-12"
                        style={{ opacity: isSelected ? 0.9 : 0.7 }}
                      >
                        {itm.qty}
                        {itm.uom} (ItemCode: {itm.itemCode})
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {selectedItem && (
            <div className="d-flex align-items-center text-success fw-bold font-14 mt-2">
              <span className="me-2">✓ Selected:</span>
              <span>{selectedItem.itemName}</span>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button
            className="btn-outline px-4"
            onClick={() => setnewItemModal(false)}
          >
            Cancel
          </Button>
          <Button
            className="btn-filled"
            onClick={handleAddNewItem}
            disabled={!selectedItem}
          >
            Add
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
