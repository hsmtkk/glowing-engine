import os

import google.auth.transport.requests
import google.oauth2.id_token
import pandas as pd
import requests
import streamlit as st


def main() -> None:
    back_service_url: str = os.environ["BACK_SERVICE_URL"]
    id_token: str = get_id_token(back_service_url)
    headers: dict[str, str] = {"Authorization": f"Bearer {id_token}"}

    with st.form("form"):
        keyword: str = st.text_input(label="キーワード", value="新宿")
        submitted: bool = st.form_submit_button("送信")

        if submitted:
            params: dict[str, str] = {"keyword": keyword}
            resp = requests.get(back_service_url, headers=headers, params=params)
            if resp.status_code < 200 or resp.status_code >= 300:
                st.error(f"HTTP status code {resp.status_code}: {resp.text}")
            resp_dict = resp.json()
            df = pd.DataFrame.from_dict(resp_dict)
            st.dataframe(df)
            st.map(df)


def get_id_token(audience: str) -> str:
    auth_req = google.auth.transport.requests.Request()
    id_token: str = google.oauth2.id_token.fetch_id_token(auth_req, audience)
    return id_token


main()
