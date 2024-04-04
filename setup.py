from setuptools import setup, find_packages

with open("requirements.txt") as f:
	install_requires = f.read().strip().split("\n")

# get version from __version__ variable in wms/__init__.py
from wms import __version__ as version

setup(
	name="wms",
	version=version,
	description="Workflow Management System",
	author="Manju",
	author_email="manjunath.s@ciphercode.co",
	packages=find_packages(),
	zip_safe=False,
	include_package_data=True,
	install_requires=install_requires
)
