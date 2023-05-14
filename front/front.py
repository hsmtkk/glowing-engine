import os

import pandas as pd
import requests
import streamlit as st

with st.form("form"):
    back_service_url = os.environ["BACK_SERVICE_URL"]
    keyword = st.text_input(label="キーワード", value="新宿")
    submitted = st.form_submit_button("送信")

    if submitted:
        params = {"keyword": keyword}
        resp = requests.get(back_service_url, params=params)
        if resp.status_code < 200 or resp.status_code >= 300:
            st.error(f"HTTP status code {resp.status_code}: {resp.text}")
        resp_dict = resp.json()
        st.write(resp_dict)
