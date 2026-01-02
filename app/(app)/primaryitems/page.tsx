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
}: {
  groupIndex: number;
  con: any;
  dispatch: any;
  isLoading: boolean;
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Local state for the "Quick Bulk Action" on this specific table
  const [localOperator, setLocalOperator] = useState<"+" | "-">("+");
  const [localPercent, setLocalPercent] = useState<number | "">("");

  // 1. Filter items based on search term
  const filteredItems = useMemo(() => {
    if (!searchTerm) return con.items;
    const lowerSearch = searchTerm.toLowerCase();
    return con.items.filter(
      (item: any) =>
        item.itemName?.toLowerCase().includes(lowerSearch) ||
        item.mainItemName?.toLowerCase().includes(lowerSearch) ||
        item.platform?.toLowerCase().includes(lowerSearch) ||
        item.vegType?.toLowerCase() == lowerSearch
    );
  }, [con.items, searchTerm]);

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
    if (!localPercent) return;
    dispatch(
      applyMathToSelected({
        groupIndex,
        operator: localOperator,
        percentage: Number(localPercent),
      })
    );
    // Optional: clear input after apply
    setLocalPercent("");
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
            {row.platform}
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
        name: "Actual Orders",
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

  // Calculate how many are checked to show/hide bulk controls
  const checkedCount = con.items.filter((i: any) => i.checked).length;

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
        </div>

        {/* Search and Bulk Actions Row */}
        <Row className="g-2 align-items-center">
          {/* Search Bar */}
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
              <Form.Control
                placeholder="Search items, platform, event, food type..."
                className="border-start-0 ps-0"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </Col>

          {/* Inline Bulk Update Controls (Visible only when items are selected) */}
          {checkedCount > 0 && (
            <Col xs={12} md={6}>
              <div className="d-flex align-items-center bg-white border rounded p-1">
                <span className="font-12 fw-bold text-nowrap px-2">
                  Selected ({checkedCount}):
                </span>
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
                <Form.Control
                  type="number"
                  size="sm"
                  placeholder="%"
                  style={{ width: "60px" }}
                  value={localPercent}
                  onChange={(e) => setLocalPercent(Number(e.target.value))}
                  className="me-1"
                />
                <Button
                  size="sm"
                  className="btn-filled py-0 font-12"
                  onClick={handleLocalBulkUpdate}
                  disabled={!localPercent}
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
  const { list: primaryItemList, isFetched } = useSelector(
    (state: RootState) => state.primaryItems
  );

  const [filterModal, setfilterModal] = useState(false);
  const [filterType, setFilterType] = useState<"online" | "event">("event");
  const [operator, setOperator] = useState<"+" | "-">("+");
  const [percentage, setPercentage] = useState<number>(0);

  // State to manage the Active Tab
  const [key, setKey] = useState<string | number>(0);

  const buildPrimaryItemPayload = (cfg: any) => {
    return {
      cloud_kitchen_id: loginDetails?.cloudKitchenId,
      delivery_date: new Date(cfg.date).toISOString().split("T")[0],
      sale_days: cfg.days,
      previous_week_count: 1,
      sale_dates: cfg.custom_date_range,
    };
  };

  useEffect(() => {
    if (!loginDetails || !config?.length) return;

    if (isFetched) return;

    const fetchAll = async () => {
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
    };

    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, loginDetails]);

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
            <span className="font-24 fw-bold ms-3">Primary Items</span>
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
                  />
                </Row>
              </Tab>
            ))}
          </Tabs>
        </Col>
      </Row>

      {/* Global Filter Modal (Retained) */}
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
    </Container>
  );
}
