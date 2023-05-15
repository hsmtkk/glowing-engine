import os

import google.auth.transport.requests
import google.oauth2.id_token
import pandas as pd
import requests
import streamlit as st

def main() -> None:
    back_service_url = os.environ["BACK_SERVICE_URL"]
    id_token = get_id_token(back_service_url)
    headers = {"Authorization", f"Bearer {id_token}"}

    with st.form("form"):
        keyword = st.text_input(label="キーワード", value="新宿")
        submitted = st.form_submit_button("送信")

        if submitted:
            params = {"keyword": keyword}
            resp = requests.get(back_service_url, headers=headers, params=params)
            if resp.status_code < 200 or resp.status_code >= 300:
                st.error(f"HTTP status code {resp.status_code}: {resp.text}")
            resp_dict = resp.json()
            st.write(resp_dict)

def get_id_token(audience:str) -> str:
    auth_req = google.auth.transport.requests.Request()
    id_token = google.oauth2.id_token.fetch_id_token(auth_req, audience)
    return id_token

main()
