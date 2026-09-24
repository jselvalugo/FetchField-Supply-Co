export const productGet = (overrides: { stock?: number; price?: string; status?: string } = {}) => ({
  aliexpress_ds_product_get_response: {
    rsp_code: 200,
    result: {
      ae_item_base_info_dto: {
        product_id: 1005006123456789,
        subject: "Reflective Nylon Dog Leash 5ft Padded Handle",
        detail: '<div><p>Strong leash<br>for walking</p><script>alert(1)</script><img src="x" onerror="steal()"></div>',
        product_status_type: overrides.status ?? "onSelling",
        currency_code: "USD",
      },
      ae_item_sku_info_dtos: {
        ae_item_sku_info_d_t_o: [
          {
            sku_id: "12000036123456701",
            sku_attr: "14:193#Moss;5:100014064",
            offer_sale_price: overrides.price ?? "6.42",
            sku_price: "9.80",
            sku_available_stock: overrides.stock ?? 412,
            currency_code: "USD",
            ae_sku_property_dtos: {
              ae_sku_property_d_t_o: [
                { sku_property_name: "Color", sku_property_value: "Green", property_value_definition_name: "Moss" },
                { sku_property_name: "Length", sku_property_value: "1.5m" },
              ],
            },
          },
        ],
      },
      ae_multimedia_info_dto: {
        image_urls: "https://ae01.alicdn.com/kf/S1.jpg;https://evil.example.com/x.jpg;http://ae01.alicdn.com/kf/insecure.jpg",
      },
      package_info_dto: { package_length: 20, package_width: 12, package_height: 4, gross_weight: "0.21" },
      logistics_info_dto: { delivery_time: 9, ship_to_country: "US" },
      ae_store_info: { store_id: 9001, store_name: "Paws Factory Store", item_as_described_rating: "4.8" },
    },
  },
});

export const freight = {
  aliexpress_ds_freight_query_response: {
    result: {
      success: true,
      delivery_options: {
        delivery_option_d_t_o: [
          { code: "CAINIAO_FULFILLMENT_STD", company: "AliExpress Selection Standard", shipping_fee_cent: "0", free_shipping: true, min_delivery_days: 8, max_delivery_days: 12 },
          { code: "EMS", company: "EMS", shipping_fee_cent: "1450", free_shipping: false, min_delivery_days: 5, max_delivery_days: 9 },
        ],
      },
    },
  },
};

export const orderCreateOk = {
  aliexpress_ds_order_create_response: { result: { is_success: true, order_list: { number: [8187654321001] } } },
};
export const orderCreateRefused = {
  aliexpress_ds_order_create_response: { result: { is_success: "false", error_code: "B_DROPSHIPPER_DELIVERY_ADDRESS_VALIDATE_FAIL", error_msg: "address invalid" } },
};
export const orderGetShipped = {
  aliexpress_ds_trade_order_get_response: {
    result: {
      order_status: "WAIT_BUYER_ACCEPT_GOODS",
      logistics_info_list: { ae_order_logistics_info: { logistics_no: "LP00612345678", logistics_service: "CAINIAO_STANDARD" } },
    },
  },
};
