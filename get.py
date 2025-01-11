import os
import re
import time
import pandas as pd
from datetime import datetime
from selenium import webdriver
from bs4 import BeautifulSoup as Soup
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support import expected_conditions as EC
import random
from random import randint as rand

def smoke():
    eat=rand(0,len(titles)-1)

    print("恭喜抽中：",end="")
    print(titles[eat][0]+"\n"+titles[eat][2])

    message=titles[eat][0]+"\n"+titles[eat][2]

titles = []

whateat=input("你要查什麼：")
whatstar=float(input("你要幾星以上的(請寫數字)："))

# browser是你的webdriver
browser = webdriver.Chrome()
browser.get("https://www.google.com/maps/@22.6417806,120.332019,15z?authuser=0&entry=ttu")
element = WebDriverWait(browser, 10).until(
    EC.presence_of_element_located((By.ID, 'searchboxinput'))
)
element.send_keys(whateat)
element.send_keys(Keys.RETURN)

# 等待搜索結果加載
time.sleep(5)

# 設置最大滾動次數和滾動間隔時間
max_scrolls = 20
scroll_pause_time = 0.5
# 選擇包含搜索結果的容器
scrollable_div = WebDriverWait(browser, 10).until(
    EC.presence_of_element_located((By.CSS_SELECTOR, 'div.m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde.ecceSd div.m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde.ecceSd'))
)

for _ in range(max_scrolls):
    # 滾動到容器底部
    browser.execute_script("arguments[0].scrollTop = arguments[0].scrollHeight", scrollable_div)
    time.sleep(scroll_pause_time)

# 獲取網頁原始碼
soup = Soup(browser.page_source, "lxml")

# 獲取餐廳名稱和其他資料
title_elements = soup.select('.Nv2PK.THOPZb.CpccDe')

for elems in title_elements:
    elem = elems.select_one('.hfpxzc')
    
    business_hours_element = elems.select('.W4Efsd .W4Efsd span span span')
    star_review_element = elems.select_one('.MW4etd')
    
    title_info = []
    title_info.append(elem.get('aria-label', ''))
    title_info.append('\n')
    title_info.append(elem.get('href', ''))
    title_info.append('\n')

    business_status = 'N/A'
    if business_hours_element:
        for business_hours in business_hours_element:
            business_status_text = business_hours.text.strip()
            if any(status in business_status_text for status in ['營業中','即將打烊', '已打烊', '暫時關閉', '即將開始營業']):
                business_status = business_status_text
    
    if (any(status in business_status for status in ['營業中','即將開始營業'])) and star_review_element and float(star_review_element.text.strip())>whatstar:
        title_info.append(business_status)
        title_info.append('\n')
        title_info.append(star_review_element.text.strip())
        title_info.append('\n\n')
        titles.append(title_info)
    
browser.quit()

# 將結果輸出
for title in titles:
    print(''.join(title))
    
if titles:smoke()
while(int(input("重抽?(0/1)："))):smoke()
